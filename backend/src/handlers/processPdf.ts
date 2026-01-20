import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import Anthropic from '@anthropic-ai/sdk';
import { createHash } from 'crypto';
import { ulid } from 'ulid';
import type {
  S3Event,
  ExtractedQuestion,
  BankQuestionItem,
  ExtractionJobItem,
  Law,
} from '../lib/types.js';
import {
  createExtractionJob,
  updateExtractionJob,
  batchSaveBankQuestions,
  questionExistsByHash,
} from '../lib/dynamodb.js';

const s3Client = new S3Client({});
const secretsClient = new SecretsManagerClient({});

const TABLE_NAME = process.env.TABLE_NAME || '';
const BUCKET_NAME = process.env.BUCKET_NAME || '';
const SECRET_NAME = process.env.SECRET_NAME || '';

// Auto-approve threshold
const AUTO_APPROVE_CONFIDENCE = 0.95;

// Claude extraction prompt
const EXTRACTION_PROMPT = `You are analyzing a page from an FAI (Football Association of Ireland) Laws of the Game exam PDF.

Extract ALL quiz questions from this image. Each question has:
- A question number and text
- 4 answer options (A, B, C, D)
- One option marked with a checkmark (✓) or similar indicator as correct

For each question, determine:
1. The IFAB Law it relates to (Law 1 through Law 17)
2. A specific law reference if identifiable (e.g., "Law 12.1" for fouls)
3. Your confidence in the extraction (0-1)

IMPORTANT:
- The correct answer is indicated by a checkmark, tick mark, or highlighting
- Carefully identify which option (0=A, 1=B, 2=C, 3=D) is marked correct
- If no clear correct answer indicator, set confidence below 0.5
- Generate a brief explanation for why the answer is correct based on LOTG

Return a JSON array with this structure:
[
  {
    "text": "Question text here",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Brief explanation referencing the relevant law",
    "law": "Law 12",
    "lawReference": "Law 12.1",
    "confidence": 0.95
  }
]

If no questions are found on this page, return an empty array: []

Respond ONLY with the JSON array, no other text.`;

/**
 * Get Claude API key from Secrets Manager
 */
async function getClaudeApiKey(): Promise<string> {
  const command = new GetSecretValueCommand({
    SecretId: SECRET_NAME,
  });

  const response = await secretsClient.send(command);

  if (response.SecretString) {
    // Try to parse as JSON (in case it's stored as {"apiKey": "..."})
    try {
      const parsed = JSON.parse(response.SecretString);
      return parsed.apiKey || parsed.ANTHROPIC_API_KEY || response.SecretString;
    } catch {
      return response.SecretString;
    }
  }

  throw new Error('Claude API key not found in secret');
}

/**
 * Get PDF from S3 and convert to base64
 */
async function getPdfFromS3(bucket: string, key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const response = await s3Client.send(command);

  if (!response.Body) {
    throw new Error('Empty response from S3');
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

/**
 * Generate content hash for deduplication
 */
function generateQuestionHash(text: string, options: string[]): string {
  const content = `${text}|${options.join('|')}`.toLowerCase().trim();
  return createHash('sha256').update(content).digest('hex').substring(0, 32);
}

/**
 * Validate and normalize law value
 */
function normalizeLaw(law: string): Law | null {
  const normalized = law.trim();
  const match = normalized.match(/Law\s*(\d+)/i);
  if (match) {
    const lawNum = parseInt(match[1], 10);
    if (lawNum >= 1 && lawNum <= 17) {
      return `Law ${lawNum}` as Law;
    }
  }
  return null;
}

/**
 * Extract questions from PDF pages using Claude Vision
 */
async function extractQuestionsFromPdf(
  pdfBuffer: Buffer,
  anthropic: Anthropic
): Promise<ExtractedQuestion[]> {
  const allQuestions: ExtractedQuestion[] = [];

  // Convert PDF to base64
  const base64Pdf = pdfBuffer.toString('base64');

  // For now, send the entire PDF as a document
  // Claude can process PDF documents directly
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64Pdf,
              },
            },
            {
              type: 'text',
              text: EXTRACTION_PROMPT,
            },
          ],
        },
      ],
    });

    // Parse the response
    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      console.log('No text response from Claude');
      return allQuestions;
    }

    const responseText = textContent.text.trim();

    // Try to extract JSON from the response
    let jsonStr = responseText;

    // Handle case where response might be wrapped in markdown code blocks
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    try {
      const extracted = JSON.parse(jsonStr) as ExtractedQuestion[];

      if (Array.isArray(extracted)) {
        for (const q of extracted) {
          // Validate required fields
          if (
            q.text &&
            Array.isArray(q.options) &&
            q.options.length === 4 &&
            typeof q.correctAnswer === 'number' &&
            q.correctAnswer >= 0 &&
            q.correctAnswer <= 3
          ) {
            const normalizedLaw = normalizeLaw(q.law || 'Law 1');
            allQuestions.push({
              text: q.text,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation || '',
              law: normalizedLaw || 'Law 1',
              lawReference: q.lawReference || normalizedLaw || 'Law 1',
              confidence: typeof q.confidence === 'number' ? Math.min(1, Math.max(0, q.confidence)) : 0.5,
            });
          }
        }
      }
    } catch (parseError) {
      console.error('Error parsing Claude response:', parseError);
      console.log('Response text:', responseText);
    }
  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw error;
  }

  return allQuestions;
}

/**
 * Lambda handler triggered by S3 upload
 */
export async function handler(event: S3Event): Promise<void> {
  console.log('Event:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    console.log(`Processing PDF: s3://${bucket}/${key}`);

    // Extract job ID from key (uploads/{jobId}/filename.pdf)
    const keyParts = key.split('/');
    const jobId = keyParts[1] || ulid();
    const fileName = keyParts[keyParts.length - 1] || 'unknown.pdf';

    // Create extraction job record
    const now = new Date().toISOString();
    const job: ExtractionJobItem = {
      PK: `JOB#${jobId}`,
      SK: 'METADATA',
      Type: 'ExtractionJob',
      jobId,
      s3Key: key,
      fileName,
      status: 'processing',
      totalQuestions: 0,
      approvedCount: 0,
      pendingCount: 0,
      rejectedCount: 0,
      duplicateCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    await createExtractionJob(job);

    try {
      // Get Claude API key
      const apiKey = await getClaudeApiKey();
      const anthropic = new Anthropic({ apiKey });

      // Get PDF from S3
      const pdfBuffer = await getPdfFromS3(bucket, key);
      console.log(`Downloaded PDF: ${pdfBuffer.length} bytes`);

      // Extract questions using Claude
      const extractedQuestions = await extractQuestionsFromPdf(pdfBuffer, anthropic);
      console.log(`Extracted ${extractedQuestions.length} questions`);

      // Process and deduplicate questions
      const questionsToSave: BankQuestionItem[] = [];
      let duplicateCount = 0;
      let autoApprovedCount = 0;
      let pendingCount = 0;

      for (const extracted of extractedQuestions) {
        const hash = generateQuestionHash(extracted.text, extracted.options);

        // Check for duplicates
        const isDuplicate = await questionExistsByHash(hash);
        if (isDuplicate) {
          duplicateCount++;
          console.log(`Duplicate question found: ${extracted.text.substring(0, 50)}...`);
          continue;
        }

        const questionId = ulid();
        const autoApprove = extracted.confidence >= AUTO_APPROVE_CONFIDENCE;

        if (autoApprove) {
          autoApprovedCount++;
        } else {
          pendingCount++;
        }

        const question: BankQuestionItem = {
          PK: `QUESTION#${questionId}`,
          SK: 'METADATA',
          Type: 'BankQuestion',
          questionId,
          text: extracted.text,
          options: extracted.options,
          correctAnswer: extracted.correctAnswer,
          explanation: extracted.explanation,
          law: extracted.law,
          lawReference: extracted.lawReference,
          confidence: extracted.confidence,
          status: autoApprove ? 'approved' : 'pending_review',
          sourceFile: key,
          jobId,
          hash,
          createdAt: now,
          updatedAt: now,
        };

        questionsToSave.push(question);
      }

      // Save questions to DynamoDB
      if (questionsToSave.length > 0) {
        await batchSaveBankQuestions(questionsToSave);
      }

      // Update job status
      await updateExtractionJob(jobId, {
        status: 'completed',
        totalQuestions: questionsToSave.length,
        approvedCount: autoApprovedCount,
        pendingCount,
        rejectedCount: 0,
        duplicateCount,
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      console.log(
        `Job ${jobId} completed: ${questionsToSave.length} questions saved, ${autoApprovedCount} auto-approved, ${pendingCount} pending review, ${duplicateCount} duplicates`
      );
    } catch (error) {
      console.error(`Error processing job ${jobId}:`, error);

      await updateExtractionJob(jobId, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        updatedAt: new Date().toISOString(),
      });
    }
  }
}
