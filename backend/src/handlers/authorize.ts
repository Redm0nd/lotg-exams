import {
  APIGatewayTokenAuthorizerEvent,
  APIGatewayAuthorizerResult,
  PolicyDocument,
  Statement,
} from 'aws-lambda';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE;
const ROLES_NAMESPACE = 'https://lotg-exams.com/roles';

interface DecodedToken {
  iss: string;
  sub: string;
  aud: string | string[];
  exp: number;
  iat: number;
  [key: string]: unknown;
}

const client = jwksClient({
  jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 600000, // 10 minutes
});

function getSigningKey(kid: string): Promise<string> {
  return new Promise((resolve, reject) => {
    client.getSigningKey(kid, (err, key) => {
      if (err) {
        reject(err);
        return;
      }
      const signingKey = key?.getPublicKey();
      if (!signingKey) {
        reject(new Error('Unable to get signing key'));
        return;
      }
      resolve(signingKey);
    });
  });
}

function generatePolicy(
  principalId: string,
  effect: 'Allow' | 'Deny',
  resource: string,
  context?: Record<string, string | number | boolean>
): APIGatewayAuthorizerResult {
  const statement: Statement = {
    Action: 'execute-api:Invoke',
    Effect: effect,
    Resource: resource,
  };

  const policyDocument: PolicyDocument = {
    Version: '2012-10-17',
    Statement: [statement],
  };

  const authResponse: APIGatewayAuthorizerResult = {
    principalId,
    policyDocument,
  };

  if (context) {
    authResponse.context = context;
  }

  return authResponse;
}

export async function handler(
  event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> {
  console.log('Authorizer invoked');

  if (!AUTH0_DOMAIN || !AUTH0_AUDIENCE) {
    console.error('Missing AUTH0_DOMAIN or AUTH0_AUDIENCE environment variables');
    throw new Error('Unauthorized');
  }

  const token = event.authorizationToken?.replace('Bearer ', '');

  if (!token) {
    console.error('No token provided');
    throw new Error('Unauthorized');
  }

  try {
    // Decode token header to get kid
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === 'string' || !decoded.header.kid) {
      console.error('Invalid token format');
      throw new Error('Unauthorized');
    }

    // Get signing key from Auth0
    const signingKey = await getSigningKey(decoded.header.kid);

    // Verify token
    const verified = jwt.verify(token, signingKey, {
      audience: AUTH0_AUDIENCE,
      issuer: `https://${AUTH0_DOMAIN}/`,
      algorithms: ['RS256'],
    }) as DecodedToken;

    // Extract roles from token
    const roles = (verified[ROLES_NAMESPACE] as string[]) || [];
    const isAdmin = roles.includes('admin');

    console.log(`Token verified for user: ${verified.sub}, isAdmin: ${isAdmin}`);

    // For admin routes, require admin role
    // The methodArn format: arn:aws:execute-api:region:account:api-id/stage/method/resource
    const methodArn = event.methodArn;
    const isAdminRoute = methodArn.includes('/admin/');

    if (isAdminRoute && !isAdmin) {
      console.log('User attempted to access admin route without admin role');
      return generatePolicy(verified.sub, 'Deny', event.methodArn);
    }

    // Allow access - use wildcard for resource to enable caching across endpoints
    const arnParts = event.methodArn.split(':');
    const apiGatewayArn = arnParts[5].split('/');
    const region = arnParts[3];
    const accountId = arnParts[4];
    const apiId = apiGatewayArn[0];
    const stage = apiGatewayArn[1];
    const wildcardArn = `arn:aws:execute-api:${region}:${accountId}:${apiId}/${stage}/*`;

    return generatePolicy(verified.sub, 'Allow', wildcardArn, {
      userId: verified.sub,
      isAdmin: isAdmin,
      roles: roles.join(','),
    });
  } catch (error) {
    console.error('Token verification failed:', error);
    throw new Error('Unauthorized');
  }
}
