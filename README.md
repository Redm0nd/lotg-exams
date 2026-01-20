# LOTG Exams - Laws of the Game Quiz Application

A serverless quiz application for testing knowledge of football's Laws of the Game (IFAB), built with AWS and deployed via Terraform.

## Architecture

**Serverless AWS Stack:**
- **Frontend:** React + TypeScript + Vite → S3 + CloudFront
- **Backend:** API Gateway + Lambda (Node.js 20.x)
- **Database:** DynamoDB (single-table design)
- **Infrastructure:** Terraform modules
- **CI/CD:** GitHub Actions

```
Users → CloudFront → S3 (React SPA)
                  ↓
        API Gateway → Lambda → DynamoDB
```

## Features

- Browse available quizzes organized by Laws of the Game
- Take interactive quizzes with randomized questions
- Immediate feedback with explanations and law references
- Responsive design optimized for desktop and mobile
- Serverless architecture with automatic scaling
- Cost-optimized for AWS free tier
- **Admin Interface:** Upload PDFs for AI-powered question extraction
- **Claude AI Integration:** Automatic question extraction with confidence scoring

## Security Note

This application is designed for single-user or trusted access scenarios. Admin routes (`/admin/*`) have no authentication - anyone with the API URL can access admin functionality including uploading PDFs and publishing quizzes. For production use with multiple users, implement authentication (e.g., Cognito, Auth0) on admin endpoints.

## Project Structure

```
lotg-exams/
├── .github/workflows/    # CI/CD pipelines
├── .infra/              # Terraform infrastructure
│   └── modules/
│       ├── frontend/    # S3 + CloudFront
│       ├── backend/     # API Gateway + Lambda
│       └── database/    # DynamoDB
├── backend/             # Lambda functions (TypeScript)
│   └── src/
│       ├── handlers/    # API handlers
│       └── lib/         # Shared utilities
├── frontend/            # React application
│   └── src/
│       ├── pages/       # Page components
│       ├── api/         # API client
│       └── types/       # TypeScript types
├── data/                # Quiz data (JSON)
├── scripts/             # Database seeding scripts
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- AWS Account
- AWS CLI configured
- Terraform 1.6.0 or higher

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/lotg-exams.git
cd lotg-exams
```

### 2. Deploy Infrastructure

```bash
cd .infra

# Copy and configure variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your AWS settings

# Initialize Terraform
terraform init

# Review plan
terraform plan

# Deploy
terraform apply
```

### 3. Seed Database

```bash
cd scripts
npm install

# Seed with sample data
npm run seed

# Or use custom data file
node seed-database.js ../data/my-quizzes.json
```

### 4. Deploy Backend

```bash
cd backend
npm install
npm run build

# Lambda functions are updated automatically by GitHub Actions
# Or manually update via AWS CLI (see backend/README.md)
```

### 5. Deploy Frontend

```bash
cd frontend
npm install

# Create .env file with API URL from Terraform
echo "VITE_API_URL=$(cd ../.infra && terraform output -raw api_gateway_url)" > .env

# Build
npm run build

# Sync to S3
aws s3 sync dist/ s3://$(cd ../.infra && terraform output -raw s3_bucket_name) --delete

# Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id $(cd ../.infra && terraform output -raw cloudfront_distribution_id) \
  --paths "/*"
```

### 6. Access Application

```bash
# Get CloudFront URL
cd .infra
terraform output cloudfront_url
```

Open the URL in your browser.

## Development

### Local Development

**Frontend:**
```bash
cd frontend
npm run dev
# Open http://localhost:3000
```

**Backend:**
```bash
cd backend
npm run build
# Test locally with SAM or Lambda containers
```

### Run Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## CI/CD

Automatic deployment via GitHub Actions on push to `main`:

1. **changes** - Detects which folders have changes (path-based filtering)
2. **terraform-plan/apply** - Updates infrastructure (only if `.infra/` changed, requires approval)
3. **deploy-backend** - Updates Lambda functions (only if `backend/` changed)
4. **deploy-frontend** - Syncs to S3 and invalidates CloudFront (only if `frontend/` changed)

### Required GitHub Setup

- **Secret:** `AWS_ACCOUNT_ID` - Your 12-digit AWS account ID
- **Environment:** Create "production" environment with approval required
- **AWS:** OIDC identity provider configured (Terraform creates the IAM role)

See `.github/workflows/README.md` for details.

## Cost Estimate

**Within AWS Free Tier (1,000 users/month):**
- S3, CloudFront, API Gateway, Lambda, DynamoDB: **$0/month**

**At Scale (10,000 users/month):**
- Estimated cost: **~$8-10/month**

See architecture plan for detailed cost breakdown.

## API Endpoints

### GET /quizzes
Returns list of all available quizzes.

### GET /quizzes/{id}
Returns quiz metadata.

### GET /quizzes/{id}/questions?limit=10
Returns randomized questions for a quiz.

See `backend/README.md` for detailed API documentation.

## Database Schema

Single-table DynamoDB design:

| PK | SK | Type | Description |
|----|-----|------|-------------|
| `QUIZ#{id}` | `METADATA` | Quiz | Quiz metadata |
| `QUIZ#{id}` | `QUESTION#{id}` | Question | Individual questions |
| `QUESTION#{ulid}` | `METADATA` | BankQuestion | Extracted question from PDF |
| `JOB#{ulid}` | `METADATA` | ExtractionJob | PDF extraction job |

### Global Secondary Indexes (GSIs)

| Index | Hash Key | Range Key | Purpose |
|-------|----------|-----------|---------|
| `Type-createdAt-index` | Type | createdAt | Query all items by type |
| `Law-Status-index` | law | status | Filter questions by law/status |
| `Status-CreatedAt-index` | status | createdAt | Review queue (pending questions) |
| `Hash-index` | hash | - | Question deduplication |
| `JobId-Status-index` | jobId | status | Job questions by status |

See `scripts/README.md` for data format details.

## Adding New Quizzes

1. Create quiz data in JSON format (see `data/sample-quizzes.json`)
2. Run seed script: `cd scripts && node seed-database.js your-quiz.json`
3. Quizzes appear immediately in the application

## Monitoring

- **CloudWatch Logs:** Lambda function logs
- **CloudWatch Metrics:** API Gateway, Lambda, DynamoDB metrics
- **AWS Cost Explorer:** Track monthly costs

## Troubleshooting

### API returning 500 errors
- Check Lambda CloudWatch logs
- Verify DynamoDB table exists and has data
- Check IAM role permissions

### Frontend not loading
- Check CloudFront distribution status
- Verify S3 bucket has index.html
- Check browser console for API URL

### Terraform state locked
- Wait for concurrent operations to complete
- Manually unlock if needed: `terraform force-unlock <LOCK_ID>`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes and test locally
4. Submit pull request

## License

MIT License - See LICENSE file for details.

## Resources

- [IFAB Laws of the Game](https://www.theifab.com/laws)
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [React Documentation](https://react.dev/)

## Acknowledgments

Built with reference to IFAB's Laws of the Game. This is an educational project and is not affiliated with IFAB or FIFA.
