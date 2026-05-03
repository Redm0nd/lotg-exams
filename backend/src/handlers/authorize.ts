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

// Auth0 custom claims must be namespaced; the project standard is
// https://lotg-exams.com/roles, but other commonly-seen forms are also
// checked so a mis-configured Action / Rule still works while we observe
// what the deployed setup actually puts in the token.
const PRIMARY_ROLES_NAMESPACE = 'https://lotg-exams.com/roles';
const FALLBACK_ROLES_CLAIMS = [
  'https://lotg-exams.com/roles',
  'https://lotg-exams.com/permissions',
  'permissions',
  'roles',
  'https://schemas.quickconnect.com/identity/claims/role',
];

function extractRoles(verified: DecodedToken): { roles: string[]; sourceClaim: string | null } {
  for (const claim of FALLBACK_ROLES_CLAIMS) {
    const value = verified[claim];
    if (Array.isArray(value) && value.length > 0) {
      return { roles: value as string[], sourceClaim: claim };
    }
  }
  return { roles: [], sourceClaim: null };
}

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

    const { roles, sourceClaim } = extractRoles(verified);
    const isAdmin = roles.includes('admin');

    // Diagnostic logging - prints once per cache miss (5min TTL on the
    // authorizer). Lets us see what the Auth0 token actually contains
    // when 401s/403s are reported, without needing to attach a debugger.
    const claimKeys = Object.keys(verified).filter((k) => k.includes('://') || k === 'permissions' || k === 'roles');
    console.log(
      `Token verified sub=${verified.sub} aud=${Array.isArray(verified.aud) ? verified.aud.join(',') : verified.aud} expected_namespace=${PRIMARY_ROLES_NAMESPACE} found_namespace=${sourceClaim ?? '<none>'} roles=${JSON.stringify(roles)} candidate_claims=${JSON.stringify(claimKeys)} isAdmin=${isAdmin}`
    );

    const methodArn = event.methodArn;
    const isAdminRoute = methodArn.includes('/admin/');

    if (isAdminRoute && !isAdmin) {
      console.log(
        `Denying admin route access: methodArn=${methodArn} sub=${verified.sub} roles=${JSON.stringify(roles)}`
      );
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
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    console.error(`Token verification failed: ${message}`);
    throw new Error('Unauthorized');
  }
}
