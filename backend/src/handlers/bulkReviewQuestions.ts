import type { APIGatewayProxyEvent, APIGatewayProxyResult, QuestionStatus } from '../lib/types.js';
import { getBankQuestion, updateBankQuestionStatus, updateExtractionJob, getExtractionJob } from '../lib/dynamodb.js';
import { successResponse, errorResponse } from '../lib/response.js';

interface BulkReviewRequest {
  questionIds: string[];
  status: QuestionStatus;
  reviewedBy?: string;
}

interface BulkReviewResult {
  questionId: string;
  success: boolean;
  previousStatus?: QuestionStatus;
  error?: string;
}

const VALID_STATUSES: QuestionStatus[] = ['pending_review', 'approved', 'rejected'];

/**
 * POST /admin/questions/bulk-review
 * Approve or reject multiple questions at once
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Event:', JSON.stringify(event, null, 2));

  if (!event.body) {
    return errorResponse('Request body is required', 400);
  }

  let request: BulkReviewRequest;
  try {
    request = JSON.parse(event.body);
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  if (!request.questionIds || !Array.isArray(request.questionIds) || request.questionIds.length === 0) {
    return errorResponse('questionIds array is required and must not be empty', 400);
  }

  if (request.questionIds.length > 100) {
    return errorResponse('Maximum 100 questions can be reviewed at once', 400);
  }

  if (!request.status || !VALID_STATUSES.includes(request.status)) {
    return errorResponse(`status is required and must be one of: ${VALID_STATUSES.join(', ')}`, 400);
  }

  try {
    const results: BulkReviewResult[] = [];
    const jobUpdates: Map<string, { pending: number; approved: number; rejected: number }> = new Map();

    // Process each question
    for (const questionId of request.questionIds) {
      try {
        const question = await getBankQuestion(questionId);

        if (!question) {
          results.push({
            questionId,
            success: false,
            error: 'Question not found',
          });
          continue;
        }

        const previousStatus = question.status;

        // Update the question status
        await updateBankQuestionStatus(questionId, request.status, request.reviewedBy);

        results.push({
          questionId,
          success: true,
          previousStatus,
        });

        // Track job updates
        if (previousStatus !== request.status) {
          if (!jobUpdates.has(question.jobId)) {
            jobUpdates.set(question.jobId, { pending: 0, approved: 0, rejected: 0 });
          }
          const update = jobUpdates.get(question.jobId)!;

          // Decrement old status
          if (previousStatus === 'pending_review') update.pending--;
          else if (previousStatus === 'approved') update.approved--;
          else if (previousStatus === 'rejected') update.rejected--;

          // Increment new status
          if (request.status === 'pending_review') update.pending++;
          else if (request.status === 'approved') update.approved++;
          else if (request.status === 'rejected') update.rejected++;
        }
      } catch (error) {
        console.error(`Error processing question ${questionId}:`, error);
        results.push({
          questionId,
          success: false,
          error: 'Processing failed',
        });
      }
    }

    // Apply job updates
    for (const [jobId, changes] of jobUpdates.entries()) {
      try {
        const job = await getExtractionJob(jobId);
        if (job) {
          await updateExtractionJob(jobId, {
            pendingCount: Math.max(0, job.pendingCount + changes.pending),
            approvedCount: Math.max(0, job.approvedCount + changes.approved),
            rejectedCount: Math.max(0, job.rejectedCount + changes.rejected),
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error(`Error updating job ${jobId}:`, error);
      }
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return successResponse({
      results,
      summary: {
        total: request.questionIds.length,
        successful,
        failed,
        targetStatus: request.status,
      },
    });
  } catch (error) {
    console.error('Error bulk reviewing questions:', error);
    return errorResponse('Failed to bulk review questions', 500);
  }
}
