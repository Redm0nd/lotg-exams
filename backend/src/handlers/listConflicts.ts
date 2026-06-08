import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  QuestionConflictItem,
} from '../lib/types.js';
import { getConflictsByStatus } from '../lib/dynamodb.js';
import { successResponse, errorResponse } from '../lib/response.js';

/**
 * GET /admin/conflicts?status=pending|resolved
 *
 * Lists question conflicts created during PDF import when an extracted
 * candidate had the same text+options as an existing bank question but
 * a different correct answer / explanation / law / lawReference.
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Event:', JSON.stringify(event, null, 2));

  const statusParam = event.queryStringParameters?.status;
  const status: 'pending' | 'resolved' = statusParam === 'resolved' ? 'resolved' : 'pending';

  try {
    const items = await getConflictsByStatus(status, 100);
    const conflicts = items.map(stripKeys);
    return successResponse({ conflicts, count: conflicts.length });
  } catch (error) {
    console.error('Error listing conflicts:', error);
    return errorResponse('Failed to list conflicts', 500);
  }
}

function stripKeys(item: QuestionConflictItem) {
  // Drop the internal PK/SK/Type fields from the API response.
  const { PK: _pk, SK: _sk, Type: _type, ...rest } = item;
  return rest;
}
