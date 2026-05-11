import type { APIGatewayProxyEvent, APIGatewayProxyResult, Law } from '../lib/types.js';
import { getBankQuestion, updateBankQuestionContent } from '../lib/dynamodb.js';
import { successResponse, errorResponse } from '../lib/response.js';

interface UpdateQuestionRequest {
  text?: string;
  options?: string[];
  correctAnswer?: number;
  explanation?: string;
  law?: Law;
  lawReference?: string;
}

const VALID_LAWS = new Set<Law>([
  'Law 1', 'Law 2', 'Law 3', 'Law 4', 'Law 5', 'Law 6', 'Law 7', 'Law 8', 'Law 9',
  'Law 10', 'Law 11', 'Law 12', 'Law 13', 'Law 14', 'Law 15', 'Law 16', 'Law 17',
]);

/**
 * PUT /admin/questions/{id}
 * Update the editable content of a bank question. Used to fix AI-extraction
 * errors (e.g. a wrong correctAnswer) or polish the wording of options.
 *
 * Only the fields present in the request body are updated. Status changes
 * still go through /admin/questions/{id}/review.
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

  let request: UpdateQuestionRequest;
  try {
    request = JSON.parse(event.body);
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const updates: UpdateQuestionRequest = {};

  if (request.text !== undefined) {
    if (typeof request.text !== 'string' || request.text.trim() === '') {
      return errorResponse('text must be a non-empty string', 400);
    }
    updates.text = request.text.trim();
  }

  if (request.options !== undefined) {
    if (
      !Array.isArray(request.options) ||
      request.options.length < 2 ||
      request.options.length > 8 ||
      request.options.some((o) => typeof o !== 'string' || o.trim() === '')
    ) {
      return errorResponse('options must be an array of 2-8 non-empty strings', 400);
    }
    updates.options = request.options.map((o) => o.trim());
  }

  if (request.correctAnswer !== undefined) {
    if (
      typeof request.correctAnswer !== 'number' ||
      !Number.isInteger(request.correctAnswer) ||
      request.correctAnswer < 0
    ) {
      return errorResponse('correctAnswer must be a non-negative integer', 400);
    }
    updates.correctAnswer = request.correctAnswer;
  }

  if (request.explanation !== undefined) {
    if (typeof request.explanation !== 'string') {
      return errorResponse('explanation must be a string', 400);
    }
    updates.explanation = request.explanation.trim();
  }

  if (request.law !== undefined) {
    if (!VALID_LAWS.has(request.law)) {
      return errorResponse('law must be one of Law 1 through Law 17', 400);
    }
    updates.law = request.law;
  }

  if (request.lawReference !== undefined) {
    if (typeof request.lawReference !== 'string' || request.lawReference.trim() === '') {
      return errorResponse('lawReference must be a non-empty string', 400);
    }
    updates.lawReference = request.lawReference.trim();
  }

  if (Object.keys(updates).length === 0) {
    return errorResponse('At least one field must be provided', 400);
  }

  try {
    const existing = await getBankQuestion(questionId);
    if (!existing) {
      return errorResponse('Question not found', 404);
    }

    // Cross-field validation: correctAnswer must index into options. Check
    // against the new options if they're being changed, otherwise the
    // existing options.
    const effectiveOptions = updates.options ?? existing.options;
    const effectiveCorrect = updates.correctAnswer ?? existing.correctAnswer;
    if (effectiveCorrect >= effectiveOptions.length) {
      return errorResponse(
        `correctAnswer ${effectiveCorrect} is out of range for ${effectiveOptions.length} option(s)`,
        400
      );
    }

    await updateBankQuestionContent(questionId, updates);

    return successResponse({
      questionId,
      updated: Object.keys(updates),
      message: 'Question updated successfully',
    });
  } catch (error) {
    console.error('Error updating question:', error);
    return errorResponse('Failed to update question', 500);
  }
}
