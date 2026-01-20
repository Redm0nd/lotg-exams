import type { APIGatewayProxyEvent, APIGatewayProxyResult, Question } from '../lib/types.js';
import { getApprovedQuestionsByJobId, getExtractionJob, shuffleArray } from '../lib/dynamodb.js';
import { successResponse, errorResponse } from '../lib/response.js';

/**
 * GET /quizzes/{id}/questions
 * Returns randomized questions for a quiz (without correct answers)
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Event:', JSON.stringify(event, null, 2));

  const quizId = event.pathParameters?.id;
  const limitParam = event.queryStringParameters?.limit;
  const limit = limitParam ? parseInt(limitParam, 10) : 10;

  if (!quizId) {
    return errorResponse('Missing quiz ID', 400);
  }

  if (isNaN(limit) || limit < 1 || limit > 50) {
    return errorResponse('Limit must be between 1 and 50', 400);
  }

  try {
    // Verify the job exists and is published
    const job = await getExtractionJob(quizId);

    if (!job || !job.published || job.approvedCount === 0) {
      return errorResponse('Quiz not found', 404);
    }

    // Get approved questions for this job
    const questions = await getApprovedQuestionsByJobId(quizId);

    if (questions.length === 0) {
      return errorResponse('No questions found for this quiz', 404);
    }

    // Shuffle and limit questions
    const shuffled = shuffleArray(questions).slice(0, limit);

    // Transform to response format (without correct answers)
    const response: Question[] = shuffled.map((q) => ({
      questionId: q.questionId,
      text: q.text,
      options: q.options,
    }));

    return successResponse(response);
  } catch (error) {
    console.error('Error fetching questions:', error);
    return errorResponse('Failed to fetch questions', 500);
  }
}
