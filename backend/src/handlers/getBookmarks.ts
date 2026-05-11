import type { APIGatewayProxyEvent, APIGatewayProxyResult } from '../lib/types.js';
import { getUserBookmarks, getBankQuestion } from '../lib/dynamodb.js';
import { successResponse, errorResponse } from '../lib/response.js';
import { verifyToken } from '../lib/verifyToken.js';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userId = await verifyToken(
    event.headers?.Authorization || event.headers?.authorization
  );
  if (!userId) return errorResponse('Authentication required', 401);

  try {
    const bookmarks = await getUserBookmarks(userId);

    const questions = (
      await Promise.all(
        bookmarks.map(async (b) => {
          const q = await getBankQuestion(b.questionId);
          if (!q) return null;
          return {
            questionId: q.questionId,
            text: q.text,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            lawReference: q.lawReference,
            bookmarkedAt: b.createdAt,
          };
        })
      )
    ).filter(Boolean);

    return successResponse({ questions, count: questions.length });
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    return errorResponse('Failed to fetch bookmarks', 500);
  }
}
