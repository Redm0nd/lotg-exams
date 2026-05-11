import type { APIGatewayProxyEvent, APIGatewayProxyResult, UserStats } from '../lib/types.js';
import { getUserStats } from '../lib/dynamodb.js';
import { successResponse, errorResponse } from '../lib/response.js';
import { verifyToken } from '../lib/verifyToken.js';

/**
 * GET /me/stats
 * Returns aggregated quiz stats for the authenticated user.
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Event:', JSON.stringify(event, null, 2));

  const userId = await verifyToken(
    event.headers?.Authorization || event.headers?.authorization
  );

  if (!userId) {
    return errorResponse('Authentication required', 401);
  }

  try {
    const statsItem = await getUserStats(userId);

    if (!statsItem) {
      const empty: UserStats = {
        totalAttempts: 0,
        averageScore: 0,
        bestScore: 0,
        byLaw: {},
        currentStreak: 0,
        longestStreak: 0,
      };
      return successResponse(empty);
    }

    const stats: UserStats = {
      totalAttempts: statsItem.totalAttempts,
      averageScore: statsItem.averageScore,
      bestScore: statsItem.bestScore,
      byLaw: statsItem.byLaw,
      currentStreak: statsItem.currentStreak ?? 0,
      longestStreak: statsItem.longestStreak ?? 0,
      lastStudyDate: statsItem.lastStudyDate,
    };

    return successResponse(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return errorResponse('Failed to fetch stats', 500);
  }
}
