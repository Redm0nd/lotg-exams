import type { APIGatewayProxyEvent, APIGatewayProxyResult, QuestionStatus } from '../lib/types.js';
import { getBankQuestion, updateBankQuestionStatus, updateExtractionJob, getExtractionJob } from '../lib/dynamodb.js';
import { successResponse, errorResponse } from '../lib/response.js';

interface ReviewRequest {
  status: QuestionStatus;
  reviewedBy?: string;
}

const VALID_STATUSES: QuestionStatus[] = ['pending_review', 'approved', 'rejected'];

/**
 * PUT /admin/questions/{id}/review
 * Approve or reject a question
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Event:', JSON.stringify(event, null, 2));

  const questionId = event.pathParameters?.id;

  if (!questionId) {
    return errorResponse('Missing question ID', 400);
  }

  if (!event.body) {
    return errorResponse('Request body is required', 400);
  }

  let request: ReviewRequest;
  try {
    request = JSON.parse(event.body);
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  if (!request.status || !VALID_STATUSES.includes(request.status)) {
    return errorResponse(`status is required and must be one of: ${VALID_STATUSES.join(', ')}`, 400);
  }

  try {
    // Get the question to verify it exists and get current status
    const question = await getBankQuestion(questionId);

    if (!question) {
      return errorResponse('Question not found', 404);
    }

    const previousStatus = question.status;

    // Update the question status
    await updateBankQuestionStatus(questionId, request.status, request.reviewedBy);

    // Update the job counts if the status changed
    if (previousStatus !== request.status) {
      const job = await getExtractionJob(question.jobId);
      if (job) {
        const updates: Record<string, number> = {
          updatedAt: Date.now(),
        };

        // Decrement the old status count
        if (previousStatus === 'pending_review') {
          updates.pendingCount = Math.max(0, job.pendingCount - 1);
        } else if (previousStatus === 'approved') {
          updates.approvedCount = Math.max(0, job.approvedCount - 1);
        } else if (previousStatus === 'rejected') {
          updates.rejectedCount = Math.max(0, job.rejectedCount - 1);
        }

        // Increment the new status count
        if (request.status === 'pending_review') {
          updates.pendingCount = (updates.pendingCount ?? job.pendingCount) + 1;
        } else if (request.status === 'approved') {
          updates.approvedCount = (updates.approvedCount ?? job.approvedCount) + 1;
        } else if (request.status === 'rejected') {
          updates.rejectedCount = (updates.rejectedCount ?? job.rejectedCount) + 1;
        }

        await updateExtractionJob(question.jobId, {
          ...updates,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    return successResponse({
      questionId,
      status: request.status,
      previousStatus,
      message: `Question ${request.status === 'approved' ? 'approved' : 'rejected'} successfully`,
    });
  } catch (error) {
    console.error('Error reviewing question:', error);
    return errorResponse('Failed to review question', 500);
  }
}
