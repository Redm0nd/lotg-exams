import type { APIGatewayProxyEvent, APIGatewayProxyResult, UserAttempt } from '../lib/types.js';
import { getUserAttempts } from '../lib/dynamodb.js';
import { successResponse, errorResponse } from '../lib/response.js';
import { verifyToken } from '../lib/verifyToken.js';

/**
 * GET /me/attempts
 * Returns paginated quiz attempt history for the authenticated user.
 * Query params: limit (default 20, max 50), cursor (pagination token)
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Event:', JSON.stringify(event, null, 2));

  const userId = await verifyToken(
    event.headers?.Authorization || event.headers?.authorization
  );

  if (!userId) {
    return errorResponse('Authentication required', 401);
  }

  const limitParam = event.queryStringParameters?.limit;
  const cursor = event.queryStringParameters?.cursor;

  let limit = 20;
  if (limitParam) {
    limit = parseInt(limitParam, 10);
    if (isNaN(limit) || limit < 1 || limit > 50) {
      return errorResponse('limit must be between 1 and 50', 400);
    }
  }

  let lastEvaluatedKey: Record<string, unknown> | undefined;
  if (cursor) {
    try {
      lastEvaluatedKey = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
    } catch {
      return errorResponse('Invalid cursor', 400);
    }
  }

  try {
    const { items, lastEvaluatedKey: nextKey } = await getUserAttempts(
      userId,
      limit,
      lastEvaluatedKey
    );

    const attempts: UserAttempt[] = items.map((item) => ({
      attemptId: item.SK,
      quizId: item.quizId,
      score: item.score,
      total: item.total,
      percentage: item.percentage,
      questionResults: item.questionResults,
      createdAt: item.createdAt,
    }));

    const nextCursor = nextKey
      ? Buffer.from(JSON.stringify(nextKey)).toString('base64')
      : undefined;

    return successResponse({
      attempts,
      ...(nextCursor && { nextCursor }),
    });
  } catch (error) {
    console.error('Error fetching attempts:', error);
    return errorResponse('Failed to fetch attempts', 500);
  }
}
