import type { APIGatewayProxyEvent, APIGatewayProxyResult } from '../lib/types.js';
import { removeBookmark } from '../lib/dynamodb.js';
import { successResponse, errorResponse } from '../lib/response.js';
import { verifyToken } from '../lib/verifyToken.js';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userId = await verifyToken(
    event.headers?.Authorization || event.headers?.authorization
  );
  if (!userId) return errorResponse('Authentication required', 401);

  const questionId = event.pathParameters?.questionId;
  if (!questionId) return errorResponse('questionId is required', 400);

  try {
    await removeBookmark(userId, questionId);
    return successResponse({ questionId, message: 'Bookmark removed' });
  } catch (error) {
    console.error('Error removing bookmark:', error);
    return errorResponse('Failed to remove bookmark', 500);
  }
}
