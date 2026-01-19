import type { APIGatewayProxyEvent, APIGatewayProxyResult, QuizDetail } from '../lib/types.js';
import { getQuizById } from '../lib/dynamodb.js';
import { successResponse, errorResponse } from '../lib/response.js';

/**
 * GET /quizzes/{id}
 * Returns quiz metadata
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Event:', JSON.stringify(event, null, 2));

  const quizId = event.pathParameters?.id;

  if (!quizId) {
    return errorResponse('Missing quiz ID', 400);
  }

  try {
    const quiz = await getQuizById(quizId);

    if (!quiz) {
      return errorResponse('Quiz not found', 404);
    }

    // Transform to detail format
    const detail: QuizDetail = {
      quizId: quiz.quizId,
      title: quiz.title,
      description: quiz.description,
      category: quiz.category,
      questionCount: quiz.questionCount,
      createdAt: quiz.createdAt,
      updatedAt: quiz.updatedAt,
    };

    return successResponse(detail);
  } catch (error) {
    console.error('Error fetching quiz:', error);
    return errorResponse('Failed to fetch quiz', 500);
  }
}
