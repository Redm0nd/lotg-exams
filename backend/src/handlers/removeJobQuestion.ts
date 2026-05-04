import type { APIGatewayProxyEvent, APIGatewayProxyResult } from '../lib/types.js';
import {
  getBankQuestion,
  updateBankQuestionStatus,
  updateExtractionJob,
  getExtractionJob,
} from '../lib/dynamodb.js';
import { successResponse, errorResponse } from '../lib/response.js';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const jobId = event.pathParameters?.id;
  const questionId = event.pathParameters?.questionId;

  if (!jobId || !questionId) return errorResponse('Missing job ID or question ID', 400);

  try {
    const question = await getBankQuestion(questionId);
    if (!question) return errorResponse('Question not found', 404);
    if (question.jobId !== jobId) return errorResponse('Question does not belong to this job', 400);
    if (question.status !== 'approved') return errorResponse('Question is not approved', 400);

    const job = await getExtractionJob(jobId);
    if (!job) return errorResponse('Job not found', 404);

    await updateBankQuestionStatus(questionId, 'rejected');
    await updateExtractionJob(jobId, {
      approvedCount: Math.max(0, job.approvedCount - 1),
      rejectedCount: job.rejectedCount + 1,
      updatedAt: new Date().toISOString(),
    } as any);

    return successResponse({
      questionId,
      message: 'Question removed from quiz',
      approvedCount: Math.max(0, job.approvedCount - 1),
    });
  } catch (error) {
    console.error('Error removing question:', error);
    return errorResponse('Failed to remove question', 500);
  }
}
