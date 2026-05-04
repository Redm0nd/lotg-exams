import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Question,
  QuestionWithAnswer,
} from '../lib/types.js';
import {
  getApprovedQuestionsByJobId,
  getExtractionJob,
  shuffleArray,
  updateQuestionUsage,
} from '../lib/dynamodb.js';
import { successResponse, errorResponse } from '../lib/response.js';
import { verifyToken } from '../lib/verifyToken.js';

/**
 * GET /quizzes/{id}/questions
 * Returns randomized questions for a quiz.
 * ?mode=study requires auth and includes correct answers + explanations.
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Event:', JSON.stringify(event, null, 2));

  const quizId = event.pathParameters?.id;
  const limitParam = event.queryStringParameters?.limit;
  const mode = event.queryStringParameters?.mode;
  const isStudyMode = mode === 'study';

  if (!quizId) {
    return errorResponse('Missing quiz ID', 400);
  }

  let limit: number | undefined;
  if (limitParam) {
    limit = parseInt(limitParam, 10);
    if (isNaN(limit) || limit < 1 || limit > 50) {
      return errorResponse('Limit must be between 1 and 50', 400);
    }
  }

  try {
    const job = await getExtractionJob(quizId);

    if (!job || !job.published || job.approvedCount === 0) {
      return errorResponse('Quiz not found', 404);
    }

    // Study mode always requires auth; non-public quizzes also require auth
    if (isStudyMode || !job.isPublic) {
      const userId = await verifyToken(
        event.headers?.Authorization || event.headers?.authorization
      );
      if (!userId) {
        return errorResponse('Authentication required', 401);
      }
    }

    const allQuestions = await getApprovedQuestionsByJobId(quizId);
    const questions = job.lawFilter
      ? allQuestions.filter((q) => q.law === job.lawFilter)
      : allQuestions;

    if (questions.length === 0) {
      return errorResponse('No questions found for this quiz', 404);
    }

    const effectiveLimit = limit ?? job.questionsPerAttempt ?? 10;
    const shuffled = shuffleArray(questions).slice(0, effectiveLimit);

    const response: (Question | QuestionWithAnswer)[] = shuffled.map((q) =>
      isStudyMode
        ? {
            questionId: q.questionId,
            text: q.text,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || 'No explanation available.',
            lawReference: q.lawReference || q.law || 'N/A',
          }
        : { questionId: q.questionId, text: q.text, options: q.options }
    );

    const questionIds = shuffled.map((q) => q.questionId);
    updateQuestionUsage(questionIds).catch((err) => {
      console.error('Error updating question usage:', err);
    });

    return successResponse(response);
  } catch (error) {
    console.error('Error fetching questions:', error);
    return errorResponse('Failed to fetch questions', 500);
  }
}
