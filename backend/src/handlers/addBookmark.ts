import type { APIGatewayProxyEvent, APIGatewayProxyResult } from '../lib/types.js';
import { addBookmark } from '../lib/dynamodb.js';
import { successResponse, errorResponse } from '../lib/response.js';
import { verifyToken } from '../lib/verifyToken.js';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userId = await verifyToken(
    event.headers?.Authorization || event.headers?.authorization
  );
  if (!userId) return errorResponse('Authentication required', 401);

  let questionId: string | undefined;
  try {
    const body = JSON.parse(event.body || '{}');
    questionId = body.questionId;
  } catch {
    return errorResponse('Invalid request body', 400);
  }

  if (!questionId) return errorResponse('questionId is required', 400);

  try {
    await addBookmark(userId, questionId);
    return successResponse({ questionId, message: 'Bookmarked' });
  } catch (error) {
    console.error('Error adding bookmark:', error);
    return errorResponse('Failed to add bookmark', 500);
  }
}
