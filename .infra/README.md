# Infrastructure

Terraform configuration for LOTG Exams AWS infrastructure.

## Modules

### frontend/
- S3 bucket for static website hosting
- CloudFront distribution with OAI
- Custom error responses for SPA routing

### backend/
- API Gateway REST API
- Lambda functions (3)
- IAM roles and permissions
- CORS configuration

### database/
- DynamoDB table with GSI
- Point-in-time recovery enabled
- On-demand billing mode

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

### CloudFront distribution takes long to deploy

Normal behavior. CloudFront distributions take 15-30 minutes to deploy.

### Terraform state locked

Another operation is in progress. Wait or force unlock:
```bash
terraform force-unlock <LOCK_ID>
```

### Plan shows unexpected changes

Check for manual changes in AWS console. Terraform will revert them.
