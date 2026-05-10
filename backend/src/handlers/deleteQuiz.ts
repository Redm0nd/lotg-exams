import type { APIGatewayProxyEvent, APIGatewayProxyResult } from '../lib/types.js';
import { getExtractionJob, deleteExtractionJob } from '../lib/dynamodb.js';
import { successResponse, errorResponse } from '../lib/response.js';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const jobId = event.pathParameters?.id;
  if (!jobId) {
    return errorResponse('Missing quiz id', 400);
  }

  try {
    const job = await getExtractionJob(jobId);
    if (!job) {
      return errorResponse('Quiz not found', 404);
    }

    await deleteExtractionJob(jobId);
    return successResponse({ jobId, message: 'Quiz deleted successfully' });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    return errorResponse('Failed to delete quiz', 500);
  }
}
