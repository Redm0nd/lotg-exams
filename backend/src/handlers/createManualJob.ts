import { ulid } from 'ulid';
import type { APIGatewayProxyEvent, APIGatewayProxyResult, ExtractionJobItem } from '../lib/types.js';
import { createExtractionJob } from '../lib/dynamodb.js';
import { successResponse, errorResponse } from '../lib/response.js';

interface CreateManualJobRequest {
  title: string;
  description?: string;
  category?: string;
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
