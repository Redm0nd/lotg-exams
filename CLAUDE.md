# Claude Instructions for LOTG Exams

## Security - CRITICAL

**This is a PUBLIC repository.** Never include sensitive information in:

- Commit messages
- PR titles or descriptions
- Code comments
- Documentation files
- GitHub issue descriptions

**Sensitive information includes:**

- API keys, tokens, secrets
- Passwords or credentials
- Auth0 domain, client IDs, or any authentication config values
- AWS account IDs, ARNs, or resource identifiers
- Database connection strings
- Any environment variable values

**Instead:**

- Reference secrets by name (e.g., "Add `AUTH0_DOMAIN` secret")
- Use placeholders (e.g., `your-tenant.auth0.com`)
- Direct users to add values in GitHub Secrets or `.env` files
- Link to documentation rather than embedding config values

## Project Overview

LOTG Exams is an AWS serverless quiz application for Laws of the Game (LOTG) referee training. It uses:

- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Backend**: AWS Lambda (Node.js/TypeScript)
- **Database**: DynamoDB (single-table design)
- **Infrastructure**: Terraform
- **AI**: Claude API for PDF question extraction
- **CI/CD**: GitHub Actions

## Commit Messages

Use conventional commits format with semantic versioning:

**Types:**

- `feat:` New feature (triggers minor version bump)
- `fix:` Bug fix (triggers patch version bump)
- `docs:` Documentation only changes
- `style:` Code style changes (formatting, semicolons, etc.)
- `refactor:` Code change that neither fixes nor adds
- `test:` Adding or updating tests
- `chore:` Maintenance (deps, CI, tooling)
- `ci:` CI/CD pipeline changes
- `perf:` Performance improvements

**Format:** `<type>(<scope>): <description>`

**Examples:**

```
feat(auth): add Google OAuth login
fix(quiz): resolve timer not stopping on submit
docs(readme): update deployment instructions
refactor(api): extract validation to shared module
ci(deploy): add staging environment
```

**Breaking Changes:**

- Add `!` after type: `feat(api)!: change response format`
- Or include `BREAKING CHANGE:` in commit body (triggers major version bump)

## Terraform Guidelines

Follow AWS Well-Architected Framework principles:

### Structure

- Use modules for reusable components (see `.infra/modules/`)
- Keep root module minimal - orchestration only
- Use `variables.tf` for inputs, `outputs.tf` for outputs

### Best Practices

- Tag all resources consistently with `project`, `environment`, `managed_by`
- Prefer managed services over self-hosted (e.g., DynamoDB over self-managed DB)
- Use least-privilege IAM policies - only grant permissions needed
- Enable encryption at rest for all data stores
- Use `terraform fmt` before committing
- **Keep Terraform DRY** - use `for_each`, `locals`, and modules to avoid repetition
- **Lambda log groups**: Always create a corresponding `aws_cloudwatch_log_group` with
  `retention_in_days = 3` when adding Lambda functions (add to `local.lambda_functions`
  in `.infra/modules/backend/main.tf`)

### Naming Conventions

- Resources: `${project}-${environment}-${resource_type}`
- Variables: `snake_case`
- Outputs: `snake_case`

### State Management

- State stored in S3 with DynamoDB locking (configured in `.infra/`)
- Never commit `.tfstate` files

## Code Style

### TypeScript

- Strict mode enabled (`"strict": true`)
- Prefer `async/await` over callbacks and raw promises
- Use descriptive variable names (avoid abbreviations)
- Export types/interfaces alongside implementations
- Use `type` for object shapes, `interface` for extensible contracts

### React (Frontend)

- Functional components with hooks only
- Use TypeScript interfaces for props
- Keep components focused and single-responsibility
- Co-locate styles with components (TailwindCSS classes)
- Use React Router for navigation

### Lambda Handlers (Backend)

- Single responsibility per Lambda
- Return proper API Gateway response format
- Handle errors gracefully with appropriate status codes
- Log errors with context for debugging
- Use environment variables for configuration

### API Design

- RESTful conventions for endpoints
- Consistent error response format
- Validate input at boundaries

## Project Structure

```
lotg-exams/
├── .infra/              # Terraform infrastructure
│   ├── modules/         # Reusable Terraform modules
│   └── bootstrap/       # Initial state backend setup
├── backend/             # Lambda functions (TypeScript)
│   └── src/handlers/    # Lambda handler files
├── frontend/            # React application
│   └── src/
│       ├── components/  # Reusable UI components
│       ├── pages/       # Route-level components
│       └── api/         # API client
├── scripts/             # Utility scripts
└── data/                # Sample data files
```

## Development Workflow

This project follows **trunk-based development**. `main` is the trunk — it is always deployable and CI runs on every push to it.

### Branch rules

- Branch directly from `main`; never branch off another feature branch
- Keep branches **short-lived**: aim to merge within 1–2 days
- One logical change per branch — avoid combining unrelated work
- Delete the branch immediately after merging (GitHub is configured to do this automatically via *Settings → General → Automatically delete head branches*)
- If a change is too large to merge quickly, break it into smaller incremental PRs

### Workflow

1. Create a branch from `main` using the conventional naming format:
   `<type>/<short-description>` (e.g. `feat/bookmark-questions`, `fix/timer-reset`)
2. Make changes following the style guidelines
3. Test locally:
   - Frontend: `cd frontend && npm run dev`
   - Backend: `cd backend && npm run build`
   - Terraform: `cd .infra && terraform validate && terraform plan`
4. Commit with conventional commit messages (one logical commit per change)
5. Open a PR against `main` — keep it small and reviewable
6. Merge to `main` triggers deployment via GitHub Actions

### What to avoid

- Long-lived branches (they diverge and become painful to merge)
- Stacking PRs on top of unmerged branches
- Leaving branches open after they are merged

## PR Conventions

- Title follows commit message format
- Description includes:
  - What changed and why
  - How to test
  - Screenshots for UI changes
- Keep PRs focused and reviewable (prefer small PRs over large ones)
- Reference related issues

## Testing

- Frontend: `npm run lint` (ESLint) + `npm run build` (Vite)
- Backend: `npm test` (vitest) + `npm run build` (esbuild bundle)
- Infrastructure: `terraform validate && terraform plan`

Backend tests live next to handlers as `<handler>.test.ts`. The test harness sets `AUTH0_DOMAIN` / `AUTH0_AUDIENCE` in `src/test-setup.ts` so handlers that read them at module load (authorize.ts) don't bail out before assertions run. To mock DynamoDB or `verifyToken` in a test, use `vi.hoisted` + `vi.mock` on the `.js` module specifier:

```ts
const { getExtractionJob } = vi.hoisted(() => ({ getExtractionJob: vi.fn() }));
vi.mock('../lib/dynamodb.js', () => ({ getExtractionJob }));
import { handler } from './submitAnswers.js';
```

## Environment Variables

### Frontend (`.env`)

- `VITE_API_URL` - API Gateway URL

### Backend (Lambda environment)

- `TABLE_NAME` - DynamoDB table name
- `BUCKET_NAME` - S3 bucket for uploads
- `SECRET_NAME` - Secrets Manager for API keys
- `AUTH0_DOMAIN` / `AUTH0_AUDIENCE` - JWT verification (authorize Lambda + verifyToken.ts only)

## Adding a new Lambda handler (checklist)

Every new handler touches **six** files. Missing any one of them breaks the build, the deploy, or both:

1. `backend/src/handlers/<name>.ts` - the handler itself
2. `backend/build.js` - append the handler name to the `handlers` array (esbuild bundles only what's listed here)
3. `.infra/modules/backend/main.tf` - add **(a)** the Lambda name to `local.lambda_functions` (this drives the CloudWatch log groups via `for_each`), **(b)** an `aws_lambda_function` resource, **(c)** an `aws_lambda_permission` for API Gateway to invoke it, **(d)** the API Gateway `aws_api_gateway_method` + `aws_api_gateway_integration` for the route, **(e)** a `module "cors_<route>"` (from `./modules/cors`) if the route's resource doesn't already have one, **(f)** the new resource IDs in the `aws_api_gateway_deployment.this.triggers` so the stage redeploys
4. `.infra/modules/backend/outputs.tf` - add the function_name and ARN to `lambda_function_names` and `lambda_function_arns` so the workflow can find it
5. `.github/workflows/deploy.yml` - add the function name to **(a)** the `get-outputs` job's `outputs:` block, **(b)** the `terraform output -json lambda_function_names | jq` block, **(c)** a new `Update Lambda - <name>` step in `deploy-backend`. Without this, infra changes deploy but backend-only fixes won't ship.
6. `frontend/src/api/client.ts` + `frontend/src/types/index.ts` - if the frontend calls it

If the new handler needs admin auth, use `authorization = "CUSTOM"` + `authorizer_id = aws_api_gateway_authorizer.jwt.id` on the method, and put the path under `/admin/...`. The authorizer Lambda treats any methodArn containing `/admin/` as admin-only.

If the handler needs to identify the current user without being admin-gated (e.g. `/me/...` routes), use `authorization = "NONE"` and call `verifyToken(event.headers.Authorization)` inside the handler.

## CORS module (`.infra/modules/cors/`)

Every API Gateway resource that serves a non-OPTIONS method needs a `module "cors_<name>"` instantiation that attaches an OPTIONS preflight + mock integration + 200 method/integration responses with `Access-Control-Allow-*` headers.

**Why it's a local module, not the squidfunk one:** the registry module was deprecated. The local copy at `.infra/modules/cors/main.tf` is a near-verbatim port. The internal resource names changed from `_` (squidfunk) to `cors` (local). The `moved {}` blocks at the top of the local module's main.tf migrate state for the rename — **do not remove them** unless you've confirmed every instance's state is already at the new address. They're idempotent no-ops once state is reconciled.

**The 4xx/5xx CORS gotcha:** API Gateway's error responses (401/403 from the authorizer, etc.) don't carry CORS headers by default. Without the `aws_api_gateway_gateway_response.cors` resources at the root of the backend module, browsers see those errors as opaque `Failed to fetch`. Keep those gateway_response blocks intact — they're the only reason auth failures surface as readable error messages in the frontend.

## Terraform state gotchas

- **Renaming a resource = state migration required.** Always pair a rename (especially across modules) with a `moved {}` block. Without it, Terraform reads the change as `destroy + create`, which on parallel apply can race against AWS and produce 409 `ConflictException` errors that leave state partially migrated.
- **`import` blocks must live in the root module** (`.infra/*.tf`), not inside child modules. Use the child module's outputs to expose any IDs the import block's `id` string needs.
- **Apply is parallel by default.** Don't rely on resources being created/destroyed in a particular order across modules unless you've added explicit `depends_on`.

## Auth (Auth0) – authorizer Lambda

`backend/src/handlers/authorize.ts` is the Lambda authorizer for every `/admin/*` route. It:

1. Reads the Bearer token from the `Authorization` header
2. Verifies the signature against Auth0's JWKS (`AUTH0_DOMAIN/.well-known/jwks.json`)
3. Validates `iss` (issuer) and `aud` (audience)
4. Looks up roles via `extractRoles()` which tries a fallback list of common namespaces — `https://lotg-exams.com/roles`, `permissions`, `roles`, etc. The canonical namespace is the project-domain one; the fallbacks exist for diagnostic resilience when an Auth0 Action publishes roles under a slightly different claim name.
5. Logs one diagnostic line per cache miss (5-minute authorizer cache) showing which namespace was actually used. Check the `lotg-exams-prod-authorize` CloudWatch log group when an admin route returns 401/403.

## Question conflicts (PDF import)

PDF imports detect conflicts when a candidate has the same `text`+`options` hash as an existing bank question but the answer/explanation/law/lawReference differs (typically an IFAB law update). Conflicts are written to `CONFLICT#{id}` items and surfaced at `/admin/conflicts`. Three resolution actions:

- **Keep existing** - drop candidate, no DB change beyond marking resolved
- **Replace with new** - overwrites the existing question's outcome fields via `updateBankQuestionContent`
- **Keep both** - inserts the candidate as a new bank question (status `pending_review`) with a discriminated hash (`{originalHash}-{conflictId[:8]}`) so future identical-PDF imports still dedupe against the canonical original

True duplicates (same hash, identical outcome fields) continue to skip silently and increment `duplicateCount` on the extraction job.
