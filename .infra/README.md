# Infrastructure

Terraform configuration for LOTG Exams AWS infrastructure.

## Modules

### frontend/
- S3 bucket for static website hosting
- CloudFront distribution with OAI
- Custom error responses for SPA routing

### backend/
- API Gateway REST API with 10 endpoints
- Lambda functions (10 total: 3 public, 7 admin)
- IAM roles and permissions (separate roles for public/admin functions)
- CORS configuration for all routes
- S3 bucket for PDF uploads
- Secrets Manager for Claude API key
- S3 event trigger for PDF processing

### database/
- DynamoDB table with 5 GSIs
- Point-in-time recovery enabled
- On-demand billing mode
- Server-side encryption

## Resources

### DynamoDB Table

Single-table design with the following Global Secondary Indexes:

| Index | Hash Key | Range Key | Projection | Purpose |
|-------|----------|-----------|------------|---------|
| `Type-createdAt-index` | Type | createdAt | ALL | Query items by type |
| `Law-Status-index` | law | status | ALL | Filter questions by law/status |
| `Status-CreatedAt-index` | status | createdAt | ALL | Review queue |
| `Hash-index` | hash | - | KEYS_ONLY | Deduplication |
| `JobId-Status-index` | jobId | status | ALL | Job questions |

### S3 Bucket (PDF Uploads)

Bucket for storing uploaded PDF files for question extraction.

**Configuration:**
- Versioning: Enabled
- Encryption: AES256 (SSE-S3)
- Public access: Blocked
- CORS: Enabled for PUT/POST/GET from all origins

**Event Trigger:**
- On `s3:ObjectCreated:*` for `uploads/*.pdf`
- Invokes `processPdf` Lambda function

### Secrets Manager

Secret for storing Claude API key used by the PDF extraction Lambda.

**Secret Name:** `lotg-exams-prod-claude-api-key`

**Expected Format:**
```json
{
  "apiKey": "sk-ant-..."
}
```

### Lambda Functions

| Function | Role | Timeout | Memory | Purpose |
|----------|------|---------|--------|---------|
| getQuizzes | public | 10s | 256MB | List quizzes |
| getQuiz | public | 10s | 256MB | Get quiz details |
| getQuestions | public | 10s | 256MB | Get quiz questions |
| generatePresignedUrl | admin | 10s | 256MB | Create S3 upload URL |
| processPdf | admin | 300s | 1024MB | Extract questions from PDF |
| getExtractionJobs | admin | 10s | 256MB | List/get extraction jobs |
| getQuestionBank | admin | 10s | 256MB | Query question bank |
| reviewQuestion | admin | 10s | 256MB | Approve/reject question |
| bulkReviewQuestions | admin | 30s | 256MB | Bulk review questions |
| publishQuiz | admin | 10s | 256MB | Publish job as quiz |

## Usage

### Initialize

```bash
terraform init
```

### Plan Changes

```bash
terraform plan
```

### Apply Changes

```bash
terraform apply
```

### View Outputs

```bash
terraform output
```

Key outputs:
- `cloudfront_url` - Frontend URL
- `api_gateway_url` - API endpoint
- `dynamodb_table_name` - Database table name
- `lambda_function_names` - Map of all Lambda function names
- `s3_bucket_name` - PDF uploads bucket name

### Destroy Infrastructure

```bash
terraform destroy
```

**Warning:** This will delete all resources including data in DynamoDB.

## Configuration

Copy `terraform.tfvars.example` to `terraform.tfvars` and configure:

```hcl
aws_region   = "us-east-1"
project_name = "lotg-exams"
environment  = "prod"
```

## State Management

### Local State (Default)

State is stored locally in `.terraform/terraform.tfstate`.

**Not recommended for production** - use remote backend.

### Remote State (Recommended)

Uncomment the backend configuration in `main.tf`:

```hcl
backend "s3" {
  bucket         = "lotg-exams-terraform-state"
  key            = "terraform.tfstate"
  region         = "us-east-1"
  encrypt        = true
  dynamodb_table = "lotg-exams-terraform-locks"
}
```

Create the S3 bucket and DynamoDB table first:

```bash
# Create S3 bucket
aws s3 mb s3://lotg-exams-terraform-state --region us-east-1
aws s3api put-bucket-versioning \
  --bucket lotg-exams-terraform-state \
  --versioning-configuration Status=Enabled

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name lotg-exams-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

Then run `terraform init -migrate-state` to migrate local state to S3.

## Module Dependencies

```
main.tf
  ├─ database/     (no dependencies)
  ├─ backend/      (depends on database)
  └─ frontend/     (depends on backend)
```

The modules are applied in dependency order automatically.

## Cost Estimation

Use Terraform Cloud or Infracost:

```bash
# Install Infracost
brew install infracost

# Generate cost estimate
infracost breakdown --path .
```

## Troubleshooting

### Lambda zip files not found

Build the backend first:
```bash
cd ../backend
npm run build
```

**Note:** On initial deployment, you may need to build the backend before running `terraform apply` since Lambda resources require the zip files to exist.

### CloudFront distribution takes long to deploy

Normal behavior. CloudFront distributions take 15-30 minutes to deploy.

### Terraform state locked

Another operation is in progress. Wait or force unlock:
```bash
terraform force-unlock <LOCK_ID>
```

### Plan shows unexpected changes

Check for manual changes in AWS console. Terraform will revert them.

### Secrets Manager secret empty

The Terraform creates an empty secret. You must populate it with your Claude API key:
```bash
aws secretsmanager put-secret-value \
  --secret-id lotg-exams-prod-claude-api-key \
  --secret-string '{"apiKey":"sk-ant-..."}'
```
