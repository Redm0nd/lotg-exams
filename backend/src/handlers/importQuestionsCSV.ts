import { createHash } from 'crypto';
import { ulid } from 'ulid';
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  BankQuestionItem,
  ExtractionJobItem,
  Law,
  Difficulty,
} from '../lib/types.js';
import { createExtractionJob, saveBankQuestion } from '../lib/dynamodb.js';
import { successResponse, errorResponse } from '../lib/response.js';

const VALID_LAWS = new Set<Law>([
  'Law 1', 'Law 2', 'Law 3', 'Law 4', 'Law 5', 'Law 6', 'Law 7', 'Law 8', 'Law 9',
  'Law 10', 'Law 11', 'Law 12', 'Law 13', 'Law 14', 'Law 15', 'Law 16', 'Law 17',
]);
const VALID_DIFFICULTIES = new Set<Difficulty>(['easy', 'medium', 'hard']);

interface ParsedRow {
  law: Law;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: number;
  explanation: string;
  lawReference: string;
  difficulty?: Difficulty;
}

interface RowError {
  row: number;
  error: string;
}

function parseCSV(csv: string): string[][] {
  const lines = csv.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
  return lines.map((line) => {
    const row: string[] = [];
    let inQuotes = false;
    let current = '';
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    row.push(current.trim());
    return row;
  });
}

function validateRow(
  fields: string[],
  headerIndex: Record<string, number>
): { row: ParsedRow } | { error: string } {
  const get = (col: string) => fields[headerIndex[col]]?.trim() ?? '';

  const law = get('law') as Law;
  if (!VALID_LAWS.has(law)) return { error: `Invalid law: "${law}"` };

  const text = get('text');
  if (!text) return { error: 'text is required' };

  const optionA = get('optionA');
  const optionB = get('optionB');
  const optionC = get('optionC');
  const optionD = get('optionD');
  if (!optionA || !optionB || !optionC || !optionD)
    return { error: 'All four options (optionA–optionD) are required' };

  const correctAnswerRaw = get('correctAnswer');
  const correctAnswer = parseInt(correctAnswerRaw, 10);
  if (isNaN(correctAnswer) || correctAnswer < 0 || correctAnswer > 3)
    return { error: `correctAnswer must be 0–3, got "${correctAnswerRaw}"` };

  const explanation = get('explanation');
  if (!explanation) return { error: 'explanation is required' };

  const lawReference = get('lawReference');
  if (!lawReference) return { error: 'lawReference is required' };

  const difficultyRaw = get('difficulty');
  const difficulty = difficultyRaw
    ? VALID_DIFFICULTIES.has(difficultyRaw as Difficulty)
      ? (difficultyRaw as Difficulty)
      : undefined
    : undefined;

  return { row: { law, text, optionA, optionB, optionC, optionD, correctAnswer, explanation, lawReference, difficulty } };
}

/**
 * POST /admin/questions/import
 * Accepts CSV text (Content-Type: text/csv or JSON body with a `csv` field).
 * Creates a new manual job and imports all valid rows as approved questions.
 *
 * Required CSV columns (case-insensitive header row):
 *   law, text, optionA, optionB, optionC, optionD, correctAnswer, explanation, lawReference
 * Optional:
 *   difficulty (easy | medium | hard)
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (!event.body) return errorResponse('Request body is required', 400);

  let csvText: string;
  const contentType = event.headers?.['content-type'] ?? event.headers?.['Content-Type'] ?? '';

  if (contentType.includes('application/json')) {
    try {
      const parsed = JSON.parse(event.body);
      if (typeof parsed.csv !== 'string') return errorResponse('JSON body must have a "csv" string field', 400);
      csvText = parsed.csv;
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }
  } else {
    csvText = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf-8') : event.body;
  }

  const rows = parseCSV(csvText);
  if (rows.length < 2) return errorResponse('CSV must have a header row and at least one data row', 400);

  // Parse header (case-insensitive)
  const header = rows[0].map((h) => h.toLowerCase().replace(/\s+/g, ''));
  const requiredColumns = ['law', 'text', 'optiona', 'optionb', 'optionc', 'optiond', 'correctanswer', 'explanation', 'lawreference'];
  const missingColumns = requiredColumns.filter((col) => !header.includes(col));
  if (missingColumns.length > 0) {
    return errorResponse(`CSV is missing required columns: ${missingColumns.join(', ')}`, 400);
  }

  const headerIndex: Record<string, number> = {};
  header.forEach((col, i) => { headerIndex[col] = i; });
  // Normalize keys used in validateRow
  const normalizedIndex: Record<string, number> = {
    law: headerIndex['law'],
    text: headerIndex['text'],
    optionA: headerIndex['optiona'],
    optionB: headerIndex['optionb'],
    optionC: headerIndex['optionc'],
    optionD: headerIndex['optiond'],
    correctAnswer: headerIndex['correctanswer'],
    explanation: headerIndex['explanation'],
    lawReference: headerIndex['lawreference'],
    difficulty: headerIndex['difficulty'] ?? -1,
  };

  const validRows: ParsedRow[] = [];
  const errors: RowError[] = [];

  for (let i = 1; i < rows.length; i++) {
    const fields = rows[i];
    if (fields.length === 1 && !fields[0]) continue; // skip blank lines
    const result = validateRow(fields, normalizedIndex);
    if ('error' in result) {
      errors.push({ row: i + 1, error: result.error });
    } else {
      validRows.push(result.row);
    }
  }

  if (validRows.length === 0) {
    return errorResponse(`No valid rows found. Errors: ${errors.map((e) => `Row ${e.row}: ${e.error}`).join('; ')}`, 400);
  }

  const jobId = ulid();
  const now = new Date().toISOString();

  const job: ExtractionJobItem = {
    PK: `JOB#${jobId}`,
    SK: 'METADATA',
    Type: 'ExtractionJob',
    jobId,
    s3Key: '',
    fileName: `CSV Import — ${new Date(now).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`,
    status: 'completed',
    totalQuestions: validRows.length,
    approvedCount: validRows.length,
    pendingCount: 0,
    rejectedCount: 0,
    duplicateCount: 0,
    createdAt: now,
    updatedAt: now,
    completedAt: now,
    source: 'manual_entry',
    description: `Bulk CSV import of ${validRows.length} questions`,
    category: 'Laws of the Game',
  };

  await createExtractionJob(job);

  const savedIds: string[] = [];
  for (const row of validRows) {
    const questionId = ulid();
    const hash = createHash('sha256')
      .update(`${jobId}:${row.text}|${row.optionA}|${row.optionB}|${row.optionC}|${row.optionD}`.toLowerCase())
      .digest('hex')
      .substring(0, 32);

    const question: BankQuestionItem = {
      PK: `QUESTION#${questionId}`,
      SK: 'METADATA',
      Type: 'BankQuestion',
      questionId,
      text: row.text,
      options: [row.optionA, row.optionB, row.optionC, row.optionD],
      correctAnswer: row.correctAnswer,
      explanation: row.explanation,
      law: row.law,
      lawReference: row.lawReference,
      confidence: 1.0,
      status: 'approved',
      sourceFile: '',
      jobId,
      hash,
      createdAt: now,
      updatedAt: now,
      source: 'manual_entry',
      difficulty: row.difficulty,
      usageCount: 0,
    };

    await saveBankQuestion(question);
    savedIds.push(questionId);
  }

  return successResponse(
    {
      jobId,
      imported: savedIds.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Imported ${savedIds.length} question${savedIds.length !== 1 ? 's' : ''}${errors.length > 0 ? ` (${errors.length} row${errors.length !== 1 ? 's' : ''} skipped)` : ''}.`,
    },
    201
  );
}
