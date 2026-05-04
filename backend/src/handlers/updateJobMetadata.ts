import type { APIGatewayProxyEvent, APIGatewayProxyResult, Law } from '../lib/types.js';
import { getExtractionJob, updateExtractionJob } from '../lib/dynamodb.js';
import { successResponse, errorResponse } from '../lib/response.js';

const VALID_LAWS = new Set<Law>([
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
]);

interface UpdateMetadataRequest {
  title?: string;
  description?: string;
  category?: string;
  timeLimitMinutes?: number | null;
  questionsPerAttempt?: number | null;
  lawFilter?: Law | null;
  shuffleOptions?: boolean;
  isPublic?: boolean;
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const jobId = event.pathParameters?.id;
  if (!jobId) return errorResponse('Missing job ID', 400);
  if (!event.body) return errorResponse('Request body is required', 400);

  let request: UpdateMetadataRequest;
  try {
    request = JSON.parse(event.body);
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  if (request.timeLimitMinutes !== undefined && request.timeLimitMinutes !== null) {
    if (
      typeof request.timeLimitMinutes !== 'number' ||
      !Number.isFinite(request.timeLimitMinutes) ||
      request.timeLimitMinutes < 1 ||
      request.timeLimitMinutes > 240
    ) {
      return errorResponse('timeLimitMinutes must be between 1 and 240', 400);
    }
  }

  if (request.questionsPerAttempt !== undefined && request.questionsPerAttempt !== null) {
    if (
      typeof request.questionsPerAttempt !== 'number' ||
      !Number.isInteger(request.questionsPerAttempt) ||
      request.questionsPerAttempt < 1 ||
      request.questionsPerAttempt > 50
    ) {
      return errorResponse('questionsPerAttempt must be an integer between 1 and 50', 400);
    }
  }

  if (
    request.lawFilter !== undefined &&
    request.lawFilter !== null &&
    !VALID_LAWS.has(request.lawFilter)
  ) {
    return errorResponse('lawFilter must be a valid Law (e.g. "Law 12")', 400);
  }

  try {
    const job = await getExtractionJob(jobId);
    if (!job) return errorResponse('Job not found', 404);

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

    if (request.title !== undefined) updates.fileName = request.title.trim();
    if (request.description !== undefined) updates.description = request.description.trim();
    if (request.category !== undefined) updates.category = request.category.trim();
    if (request.timeLimitMinutes !== undefined) updates.timeLimitMinutes = request.timeLimitMinutes;
    if (request.questionsPerAttempt !== undefined)
      updates.questionsPerAttempt = request.questionsPerAttempt;
    if (request.lawFilter !== undefined) updates.lawFilter = request.lawFilter;
    if (request.shuffleOptions !== undefined) updates.shuffleOptions = request.shuffleOptions;
    if (request.isPublic !== undefined) updates.isPublic = request.isPublic;

    await updateExtractionJob(jobId, updates as any);

    return successResponse({ jobId, message: 'Metadata updated successfully' });
  } catch (error) {
    console.error('Error updating job metadata:', error);
    return errorResponse('Failed to update metadata', 500);
  }
}
