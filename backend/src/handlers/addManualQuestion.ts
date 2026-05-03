import { createHash } from 'crypto';
import { ulid } from 'ulid';
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  BankQuestionItem,
  Law,
  Difficulty,
} from '../lib/types.js';
import { getExtractionJob, updateExtractionJob, saveBankQuestion } from '../lib/dynamodb.js';
import { successResponse, errorResponse } from '../lib/response.js';

interface AddManualQuestionRequest {
  text: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  law: Law;
  lawReference: string;
  difficulty?: Difficulty;
  tags?: string[];
}

const VALID_LAWS: Law[] = [
  'Law 1',
  'Law 2',
  'Law 3',
  'Law 4',
  'Law 5',
  'Law 6',
  'Law 7',
  'Law 8',
  'Law 9',
  'Law 10',
  'Law 11',
  'Law 12',
  'Law 13',
  'Law 14',
  'Law 15',
  'Law 16',
  'Law 17',
];

const VALID_DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

function generateQuestionHash(text: string, options: string[]): string {
  const content = `${text}|${options.join('|')}`.toLowerCase().trim();
  return createHash('sha256').update(content).digest('hex').substring(0, 32);
}

/**
 * POST /admin/jobs/{id}/questions
 * Adds a question to a manual job (quiz). Each quiz gets its own copy of the
 * question so it can be managed independently. Deduplication only applies
 * within the same job — the same question can appear in multiple quizzes.
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const jobId = event.pathParameters?.id;

  if (!jobId) return errorResponse('Job ID is required', 400);
  if (!event.body) return errorResponse('Request body is required', 400);

  let request: AddManualQuestionRequest;
  try {
    request = JSON.parse(event.body);
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  if (!request.text?.trim()) return errorResponse('text is required', 400);
  if (!Array.isArray(request.options) || request.options.length !== 4)
    return errorResponse('options must be an array of exactly 4 strings', 400);
  if (request.options.some((opt) => typeof opt !== 'string' || !opt.trim()))
    return errorResponse('All options must be non-empty strings', 400);
  if (
    typeof request.correctAnswer !== 'number' ||
    request.correctAnswer < 0 ||
    request.correctAnswer > 3
  )
    return errorResponse('correctAnswer must be a number between 0 and 3', 400);
  if (!request.explanation?.trim()) return errorResponse('explanation is required', 400);
  if (!request.law || !VALID_LAWS.includes(request.law))
    return errorResponse('law must be a valid law (Law 1 through Law 17)', 400);
  if (!request.lawReference?.trim()) return errorResponse('lawReference is required', 400);
  if (request.difficulty && !VALID_DIFFICULTIES.includes(request.difficulty))
    return errorResponse('difficulty must be easy, medium, or hard', 400);
  if (request.tags && !Array.isArray(request.tags))
    return errorResponse('tags must be an array of strings', 400);

  try {
    const job = await getExtractionJob(jobId);
    if (!job) return errorResponse('Job not found', 404);

    const questionId = ulid();
    const now = new Date().toISOString();
    // Use a job-scoped hash so the same question can exist in multiple quizzes
    const hash = generateQuestionHash(`${jobId}:${request.text}`, request.options);

    const question: BankQuestionItem = {
      PK: `QUESTION#${questionId}`,
      SK: 'METADATA',
      Type: 'BankQuestion',
      questionId,
      text: request.text.trim(),
      options: request.options.map((opt) => opt.trim()),
      correctAnswer: request.correctAnswer,
      explanation: request.explanation.trim(),
      law: request.law,
      lawReference: request.lawReference.trim(),
      confidence: 1.0,
      status: 'approved',
      sourceFile: '',
      jobId,
      hash,
      createdAt: now,
      updatedAt: now,
      source: 'manual_entry',
      difficulty: request.difficulty,
      tags: request.tags?.map((t) => t.trim()).filter(Boolean),
      usageCount: 0,
    };

    await saveBankQuestion(question);
    await updateExtractionJob(jobId, {
      totalQuestions: job.totalQuestions + 1,
      approvedCount: job.approvedCount + 1,
      updatedAt: now,
    });

    return successResponse({ questionId, message: 'Question added successfully' }, 201);
  } catch (error) {
    console.error('Error adding question:', error);
    return errorResponse('Failed to add question', 500);
  }
}
