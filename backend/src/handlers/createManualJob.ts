import { ulid } from 'ulid';
import type { APIGatewayProxyEvent, APIGatewayProxyResult, ExtractionJobItem, Law } from '../lib/types.js';
import { createExtractionJob } from '../lib/dynamodb.js';
import { successResponse, errorResponse } from '../lib/response.js';

const VALID_LAWS = new Set<Law>([
  'Law 1', 'Law 2', 'Law 3', 'Law 4', 'Law 5', 'Law 6', 'Law 7', 'Law 8',
  'Law 9', 'Law 10', 'Law 11', 'Law 12', 'Law 13', 'Law 14', 'Law 15',
  'Law 16', 'Law 17',
]);

interface CreateManualJobRequest {
  title: string;
  description?: string;
  category?: string;
  timeLimitMinutes?: number;
  lawFilter?: Law;
  questionsPerAttempt?: number;
}

/**
 * POST /admin/jobs/manual
 * Creates a new "manual" job that can have questions added to it
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Event:', JSON.stringify(event, null, 2));

  if (!event.body) {
    return errorResponse('Request body is required', 400);
  }

  let request: CreateManualJobRequest;
  try {
    request = JSON.parse(event.body);
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  if (!request.title || request.title.trim() === '') {
    return errorResponse('title is required', 400);
  }

  if (request.timeLimitMinutes !== undefined) {
    if (
      typeof request.timeLimitMinutes !== 'number' ||
      !Number.isFinite(request.timeLimitMinutes) ||
      request.timeLimitMinutes < 1 ||
      request.timeLimitMinutes > 240
    ) {
      return errorResponse('timeLimitMinutes must be a number between 1 and 240', 400);
    }
  }

  if (request.questionsPerAttempt !== undefined) {
    if (
      typeof request.questionsPerAttempt !== 'number' ||
      !Number.isInteger(request.questionsPerAttempt) ||
      request.questionsPerAttempt < 1 ||
      request.questionsPerAttempt > 50
    ) {
      return errorResponse('questionsPerAttempt must be an integer between 1 and 50', 400);
    }
  }

  if (request.lawFilter !== undefined && !VALID_LAWS.has(request.lawFilter)) {
    return errorResponse('lawFilter must be a valid Law (e.g. "Law 12")', 400);
  }

  try {
    const jobId = ulid();
    const now = new Date().toISOString();

    const job: ExtractionJobItem = {
      PK: `JOB#${jobId}`,
      SK: 'METADATA',
      Type: 'ExtractionJob',
      jobId,
      s3Key: '', // No S3 key for manual jobs
      fileName: request.title.trim(),
      status: 'completed', // Manual jobs start as completed
      totalQuestions: 0,
      approvedCount: 0,
      pendingCount: 0,
      rejectedCount: 0,
      duplicateCount: 0,
      createdAt: now,
      updatedAt: now,
      completedAt: now,
      // New fields for manual entry
      source: 'manual_entry',
      description: request.description?.trim() || '',
      category: request.category?.trim() || 'Laws of the Game',
      ...(request.timeLimitMinutes !== undefined && { timeLimitMinutes: request.timeLimitMinutes }),
      ...(request.lawFilter !== undefined && { lawFilter: request.lawFilter }),
      ...(request.questionsPerAttempt !== undefined && { questionsPerAttempt: request.questionsPerAttempt }),
    };

    await createExtractionJob(job);

    return successResponse({
      jobId,
      message: 'Manual job created successfully',
    }, 201);
  } catch (error) {
    console.error('Error creating manual job:', error);
    return errorResponse('Failed to create manual job', 500);
  }
}
