import type { APIGatewayProxyEvent } from './types.js';

/**
 * Build a minimal API Gateway proxy event for handler unit tests.
 * Only the fields the handlers read are populated; everything else
 * defaults to a sensible empty value.
 */
export function buildApiGatewayEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    httpMethod: 'GET',
    path: '/',
    pathParameters: null,
    queryStringParameters: null,
    headers: {},
    body: null,
    ...overrides,
  };
}
