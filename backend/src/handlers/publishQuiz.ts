import type { APIGatewayProxyEvent, APIGatewayProxyResult } from '../lib/types.js';
import { getExtractionJob, publishJob, unpublishJob } from '../lib/dynamodb.js';
import { successResponse, errorResponse } from '../lib/response.js';

interface PublishRequest {
  publish: boolean;
}

/**
 * PUT /admin/jobs/{id}/publish
 * Publish or unpublish a job (make it visible/hidden on the homepage)
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Event:', JSON.stringify(event, null, 2));

  const jobId = event.pathParameters?.id;

  if (!jobId) {
    return errorResponse('Missing job ID', 400);
  }

  // Default to publish: true if no body provided
  let request: PublishRequest = { publish: true };

  if (event.body) {
    try {
      request = JSON.parse(event.body);
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }
  }

  const shouldPublish = request.publish !== false;

  try {
    const job = await getExtractionJob(jobId);

    if (!job) {
      return errorResponse('Job not found', 404);
    }

    // Only allow publishing completed jobs with approved questions
    if (shouldPublish && job.status !== 'completed') {
      return errorResponse('Only completed jobs can be published', 400);
    }

    if (shouldPublish && job.approvedCount === 0) {
      return errorResponse('Cannot publish a job with no approved questions', 400);
    }

    if (shouldPublish) {
      await publishJob(jobId);
    } else {
      await unpublishJob(jobId);
    }

    return successResponse({
      jobId,
      published: shouldPublish,
      message: shouldPublish
        ? 'Quiz published successfully'
        : 'Quiz unpublished successfully',
    });
  } catch (error) {
    console.error('Error publishing job:', error);
    return errorResponse('Failed to update publish status', 500);
  }
}
