// Runs before any test file is imported. Modules like authorize.ts read
// process.env at top-level, so any env var the tests rely on must be set
// here, not inside beforeAll/beforeEach (which run after imports).
process.env.AUTH0_DOMAIN = 'test.auth0.com';
process.env.AUTH0_AUDIENCE = 'https://api.test/';
