import type { APIGatewayProxyEvent, APIGatewayProxyResult, QuizSummary } from '../lib/types.js';
import { getAllQuizzes } from '../lib/dynamodb.js';
import { successResponse, errorResponse } from '../lib/response.js';

/**
 * GET /quizzes
 * Returns list of all available quizzes
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    const quizzes = await getAllQuizzes();

    // Transform to summary format
    const summaries: QuizSummary[] = quizzes.map((quiz) => ({
      quizId: quiz.quizId,
      title: quiz.title,
      description: quiz.description,
      category: quiz.category,
      questionCount: quiz.questionCount,
    }));

    return successResponse(summaries);
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    return errorResponse('Failed to fetch quizzes', 500);
  }
}
