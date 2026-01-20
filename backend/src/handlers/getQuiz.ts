import type { APIGatewayProxyEvent, APIGatewayProxyResult, QuizDetail } from '../lib/types.js';
import { getExtractionJob } from '../lib/dynamodb.js';
import { successResponse, errorResponse } from '../lib/response.js';

/**
 * Format filename into a readable quiz title
 * e.g., "laws-of-the-game-2024.pdf" -> "Laws Of The Game 2024"
 */
function formatTitle(fileName: string): string {
  return fileName
    .replace(/\.pdf$/i, '') // Remove .pdf extension
    .replace(/[-_]/g, ' ') // Replace dashes and underscores with spaces
    .replace(/\b\w/g, (char) => char.toUpperCase()); // Title case
}

/**
 * GET /quizzes/{id}
 * Returns quiz metadata (from extraction job)
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Event:', JSON.stringify(event, null, 2));

  const quizId = event.pathParameters?.id;

  if (!quizId) {
    return errorResponse('Missing quiz ID', 400);
  }

  try {
    const job = await getExtractionJob(quizId);

    if (!job) {
      return errorResponse('Quiz not found', 404);
    }

    // Only return published jobs with approved questions
    if (!job.published || job.approvedCount === 0) {
      return errorResponse('Quiz not found', 404);
    }

    // Transform job to quiz detail format
    const detail: QuizDetail = {
      quizId: job.jobId,
      title: formatTitle(job.fileName),
      description: `Questions extracted from ${job.fileName}`,
      category: 'Laws of the Game',
      questionCount: job.approvedCount,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };

    return successResponse(detail);
  } catch (error) {
    console.error('Error fetching quiz:', error);
    return errorResponse('Failed to fetch quiz', 500);
  }
}
