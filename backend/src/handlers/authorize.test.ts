import { describe, it, expect } from 'vitest';
import { extractRoles, FALLBACK_ROLES_CLAIMS, handler } from './authorize.js';

describe('extractRoles', () => {
  const baseToken = {
    iss: 'https://test.auth0.com/',
    sub: 'auth0|123',
    aud: 'https://api.test/',
    exp: 0,
    iat: 0,
  };

  it('returns the roles when found under the primary namespace', () => {
    const result = extractRoles({
      ...baseToken,
      'https://lotg-exams.com/roles': ['admin', 'editor'],
    });
    expect(result).toEqual({
      roles: ['admin', 'editor'],
      sourceClaim: 'https://lotg-exams.com/roles',
    });
  });

  it('falls back to the next namespace when the primary is missing', () => {
    const result = extractRoles({
      ...baseToken,
      permissions: ['admin'],
    });
    expect(result.roles).toEqual(['admin']);
    expect(result.sourceClaim).toBe('permissions');
  });

  it('returns empty roles when no namespace matches', () => {
    const result = extractRoles(baseToken);
    expect(result).toEqual({ roles: [], sourceClaim: null });
  });

  it('ignores non-array claim values and keeps looking', () => {
    const result = extractRoles({
      ...baseToken,
      'https://lotg-exams.com/roles': 'not-an-array',
      roles: ['admin'],
    });
    expect(result.roles).toEqual(['admin']);
    expect(result.sourceClaim).toBe('roles');
  });

  it('ignores empty arrays and keeps looking', () => {
    const result = extractRoles({
      ...baseToken,
      'https://lotg-exams.com/roles': [],
      'https://lotg-exams.com/permissions': ['admin'],
    });
    expect(result.roles).toEqual(['admin']);
    expect(result.sourceClaim).toBe('https://lotg-exams.com/permissions');
  });

  it('preserves the priority order of fallback claims', () => {
    expect(FALLBACK_ROLES_CLAIMS[0]).toBe('https://lotg-exams.com/roles');
    expect(FALLBACK_ROLES_CLAIMS[FALLBACK_ROLES_CLAIMS.length - 1]).toMatch(/quickconnect/);
  });
});

describe('handler input validation', () => {
  // These cases all throw "Unauthorized" without needing the JWT or JWKS
  // libraries to do real work, so no mocking required.
  function tokenEvent(authorizationToken: string) {
    return {
      type: 'TOKEN' as const,
      authorizationToken,
      methodArn:
        'arn:aws:execute-api:us-east-1:123456789012:abcdef123/prod/GET/admin/jobs',
    };
  }

  it('throws Unauthorized when no token is provided', async () => {
    await expect(handler(tokenEvent(''))).rejects.toThrow('Unauthorized');
  });

  it('throws Unauthorized when token is just the Bearer prefix', async () => {
    await expect(handler(tokenEvent('Bearer '))).rejects.toThrow('Unauthorized');
  });

  it('throws Unauthorized for a malformed token', async () => {
    await expect(handler(tokenEvent('Bearer not-a-real-jwt'))).rejects.toThrow(
      'Unauthorized'
    );
  });
});
