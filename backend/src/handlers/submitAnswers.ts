import type { APIGatewayProxyEvent, APIGatewayProxyResult, BankQuestionItem } from '../lib/types.js';
import { getExtractionJob, getBankQuestion } from '../lib/dynamodb.js';
import { successResponse, errorResponse } from '../lib/response.js';

interface SubmitAnswersRequest {
  answers: Array<{
    questionId: string;
    selectedOption: number;
  }>;
}

interface QuestionResult {
  questionId: string;
  text: string;
  options: string[];
  selectedOption: number;
  correctOption: number;
  isCorrect: boolean;
  explanation: string;
  lawReference: string;
}

interface SubmitAnswersResponse {
  results: QuestionResult[];
  score: {
    correct: number;
    total: number;
    percentage: number;
  };
}

/**
 * POST /quizzes/{id}/submit
 * Submits quiz answers and returns results with correct answers
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Event:', JSON.stringify(event, null, 2));

  const quizId = event.pathParameters?.id;

  if (!quizId) {
    return errorResponse('Missing quiz ID', 400);
  }

  if (!event.body) {
    return errorResponse('Request body is required', 400);
  }

  let request: SubmitAnswersRequest;
  try {
    request = JSON.parse(event.body);
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  if (!request.answers || !Array.isArray(request.answers)) {
    return errorResponse('answers array is required', 400);
  }

  try {
    // Verify the quiz exists and is published
    const job = await getExtractionJob(quizId);

    if (!job || !job.published) {
      return errorResponse('Quiz not found', 404);
    }

    // Fetch each question and build results
    const results: QuestionResult[] = [];

    for (const answer of request.answers) {
      const question = await getBankQuestion(answer.questionId);

      if (!question) {
        // Skip questions that don't exist
        console.warn(`Question not found: ${answer.questionId}`);
        continue;
      }

      // Verify question belongs to this quiz
      if (question.jobId !== quizId) {
        console.warn(`Question ${answer.questionId} does not belong to quiz ${quizId}`);
        continue;
      }

      const isCorrect = answer.selectedOption === question.correctAnswer;

      results.push({
        questionId: question.questionId,
        text: question.text,
        options: question.options,
        selectedOption: answer.selectedOption,
        correctOption: question.correctAnswer,
        isCorrect,
        explanation: question.explanation || 'No explanation available.',
        lawReference: question.lawReference || question.law || 'N/A',
      });
    }

    const correctCount = results.filter((r) => r.isCorrect).length;
    const totalCount = results.length;
    const percentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

    const response: SubmitAnswersResponse = {
      results,
      score: {
        correct: correctCount,
        total: totalCount,
        percentage,
      },
    };

    return successResponse(response);
  } catch (error) {
    console.error('Error submitting answers:', error);
    return errorResponse('Failed to submit answers', 500);
  }
}
