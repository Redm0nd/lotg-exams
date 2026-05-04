import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;

const client = AUTH0_DOMAIN
  ? jwksClient({
      jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`,
      cache: true,
      cacheMaxAge: 600000,
    })
  : null;

function getSigningKey(kid: string): Promise<string> {
  return new Promise((resolve, reject) => {
    client!.getSigningKey(kid, (err, key) => {
      if (err) return reject(err);
      const signingKey = key?.getPublicKey();
      if (!signingKey) return reject(new Error('Unable to get signing key'));
      resolve(signingKey);
    });
  });
}

/**
 * Verify a Bearer token from the Authorization header.
 * Returns the user's `sub` claim on success, or null if missing/invalid.
 */
export async function verifyToken(authHeader: string | undefined): Promise<string | null> {
  if (!AUTH0_DOMAIN || !client) return null;

  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (!token) return null;

  try {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === 'string' || !decoded.header.kid) return null;

    const signingKey = await getSigningKey(decoded.header.kid);
    const verified = jwt.verify(token, signingKey, {
      issuer: `https://${AUTH0_DOMAIN}/`,
      algorithms: ['RS256'],
    }) as { sub: string };

    return verified.sub;
  } catch {
    return null;
  }
}
