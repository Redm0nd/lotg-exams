import type { APIGatewayProxyEvent, APIGatewayProxyResult, QuizSummary } from '../lib/types.js';
import { getPublishedJobs } from '../lib/dynamodb.js';
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
 * GET /quizzes
 * Returns list of all available quizzes (published extraction jobs)
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    const jobs = await getPublishedJobs();

    // Transform published jobs to quiz summaries
    const summaries: QuizSummary[] = jobs.map((job) => ({
      quizId: job.jobId,
      title: formatTitle(job.fileName),
      description: `Questions extracted from ${job.fileName}`,
      category: 'Laws of the Game',
      questionCount: job.approvedCount,
    }));

    return successResponse(summaries);
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    return errorResponse('Failed to fetch quizzes', 500);
  }
}
