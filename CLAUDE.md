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

- Frontend: `npm run lint` (ESLint)
- Backend: `npm run build` (TypeScript compilation)
- Infrastructure: `terraform validate && terraform plan`

## Environment Variables

### Frontend (`.env`)

- `VITE_API_URL` - API Gateway URL

### Backend (Lambda environment)

- `TABLE_NAME` - DynamoDB table name
- `BUCKET_NAME` - S3 bucket for uploads
- `SECRET_NAME` - Secrets Manager for API keys
