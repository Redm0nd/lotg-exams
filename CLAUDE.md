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

1. Create feature branch from `main`
2. Make changes following style guidelines
3. Test locally:
   - Frontend: `cd frontend && npm run dev`
   - Backend: `cd backend && npm run build`
   - Terraform: `cd .infra && terraform validate && terraform plan`
4. Commit with conventional commit message
5. Push and create PR
6. Merge to `main` triggers deployment

## PR Conventions

- Title follows commit message format
- Description includes:
  - What changed and why
  - How to test
  - Screenshots for UI changes
- Keep PRs focused and reviewable
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
