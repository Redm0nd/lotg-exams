import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  BankQuestion,
  Law,
  QuestionStatus,
} from '../lib/types.js';
import {
  getAllBankQuestions,
  getQuestionsByStatus,
  getQuestionsByLaw,
} from '../lib/dynamodb.js';
import { successResponse, errorResponse } from '../lib/response.js';

const VALID_LAWS: Law[] = [
  'Law 1', 'Law 2', 'Law 3', 'Law 4', 'Law 5',
  'Law 6', 'Law 7', 'Law 8', 'Law 9', 'Law 10',
  'Law 11', 'Law 12', 'Law 13', 'Law 14', 'Law 15',
  'Law 16', 'Law 17',
];

const VALID_STATUSES: QuestionStatus[] = ['pending_review', 'approved', 'rejected'];

/**
 * GET /admin/questions
 * Returns questions from the question bank with optional filters
 * Query params: ?law=Law 1&status=approved&limit=50
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    const lawParam = event.queryStringParameters?.law;
    const statusParam = event.queryStringParameters?.status;
    const limitParam = event.queryStringParameters?.limit;
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    if (isNaN(limit) || limit < 1 || limit > 200) {
      return errorResponse('Limit must be between 1 and 200', 400);
    }

    // Validate law parameter if provided
    if (lawParam && !VALID_LAWS.includes(lawParam as Law)) {
      return errorResponse(`Invalid law. Must be one of: ${VALID_LAWS.join(', ')}`, 400);
    }

    // Validate status parameter if provided
    if (statusParam && !VALID_STATUSES.includes(statusParam as QuestionStatus)) {
      return errorResponse(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`, 400);
    }

    let items;

    if (lawParam) {
      // Query by law (and optionally status)
      items = await getQuestionsByLaw(
        lawParam as Law,
        statusParam as QuestionStatus | undefined,
        limit
      );
    } else if (statusParam) {
      // Query by status only
      items = await getQuestionsByStatus(statusParam as QuestionStatus, limit);
    } else {
      // Get all questions
      items = await getAllBankQuestions(limit);
    }

    // Transform to API response format
    const questions: BankQuestion[] = items.map((item) => ({
      questionId: item.questionId,
      text: item.text,
      options: item.options,
      correctAnswer: item.correctAnswer,
      explanation: item.explanation,
      law: item.law,
      lawReference: item.lawReference,
      confidence: item.confidence,
      status: item.status,
      sourceFile: item.sourceFile,
      jobId: item.jobId,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      reviewedAt: item.reviewedAt,
    }));

    return successResponse({
      questions,
      count: questions.length,
      filters: {
        law: lawParam || null,
        status: statusParam || null,
        limit,
      },
    });
  } catch (error) {
    console.error('Error fetching question bank:', error);
    return errorResponse('Failed to fetch questions', 500);
  }
}
