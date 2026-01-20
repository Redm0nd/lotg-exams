import type { APIGatewayProxyEvent, APIGatewayProxyResult, ExtractionJob } from '../lib/types.js';
import { getAllExtractionJobs, getExtractionJob, getQuestionsByJobId } from '../lib/dynamodb.js';
import { successResponse, errorResponse } from '../lib/response.js';

/**
 * GET /admin/jobs - List all extraction jobs
 * GET /admin/jobs/{id} - Get a specific job with its questions
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Event:', JSON.stringify(event, null, 2));

  const jobId = event.pathParameters?.id;

  try {
    if (jobId) {
      // Get single job with questions
      const job = await getExtractionJob(jobId);

      if (!job) {
        return errorResponse('Job not found', 404);
      }

      const questions = await getQuestionsByJobId(jobId);

      const response: ExtractionJob & { questions: unknown[] } = {
        jobId: job.jobId,
        fileName: job.fileName,
        status: job.status,
        totalQuestions: job.totalQuestions,
        approvedCount: job.approvedCount,
        pendingCount: job.pendingCount,
        rejectedCount: job.rejectedCount,
        duplicateCount: job.duplicateCount,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        questions: questions.map((q) => ({
          questionId: q.questionId,
          text: q.text,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          law: q.law,
          lawReference: q.lawReference,
          confidence: q.confidence,
          status: q.status,
          createdAt: q.createdAt,
        })),
      };

      return successResponse(response);
    }

    // List all jobs
    const jobs = await getAllExtractionJobs();

    const response: ExtractionJob[] = jobs.map((job) => ({
      jobId: job.jobId,
      fileName: job.fileName,
      status: job.status,
      totalQuestions: job.totalQuestions,
      approvedCount: job.approvedCount,
      pendingCount: job.pendingCount,
      rejectedCount: job.rejectedCount,
      duplicateCount: job.duplicateCount,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    }));

    return successResponse({
      jobs: response,
      count: response.length,
    });
  } catch (error) {
    console.error('Error fetching extraction jobs:', error);
    return errorResponse('Failed to fetch jobs', 500);
  }
}
