# GitHub Actions Workflows

This directory contains CI/CD workflows for the LOTG Exams application.

## Workflows

### deploy.yml

Handles complete deployment of infrastructure and application.

**Triggers:**
- Pull Request to `main`: Runs Terraform plan
- Push to `main`: Deploys infrastructure and application

**Jobs:**

1. **terraform-plan** (PR only)
   - Validates Terraform configuration
   - Generates execution plan
   - Posts plan as comment (optional enhancement)

2. **terraform-apply** (main only)
   - Applies Terraform changes
   - Outputs infrastructure URLs and IDs

3. **deploy-backend** (main only)
   - Builds Lambda functions
   - Updates function code in AWS

4. **deploy-frontend** (main only)
   - Builds React application
   - Syncs to S3
   - Invalidates CloudFront cache

5. **deployment-summary** (main only)
   - Posts deployment summary to GitHub

## Required Secrets

Configure these in GitHub repository settings (Settings → Secrets and variables → Actions):

```
AWS_ACCESS_KEY_ID         - AWS access key
AWS_SECRET_ACCESS_KEY     - AWS secret key
```

Optional:
```
AWS_REGION                - AWS region (defaults to us-east-1)
```

## Setting Up AWS Credentials

### Option 1: IAM User (Simple)

1. Create IAM user with programmatic access
2. Attach policies:
   - `AmazonS3FullAccess`
   - `AmazonDynamoDBFullAccess`
   - `AWSLambdaFullAccess`
   - `AmazonAPIGatewayAdministrator`
   - `CloudFrontFullAccess`
3. Add credentials to GitHub secrets

### Option 2: OIDC (Recommended for Production)

Uses GitHub's OIDC provider for temporary credentials (more secure).

```yaml
- name: Configure AWS Credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::ACCOUNT_ID:role/GitHubActionsRole
    aws-region: us-east-1
```

See: https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services

## Manual Deployment

To deploy manually (outside CI/CD):

```bash
# 1. Deploy infrastructure
cd .infra
terraform init
terraform apply

# 2. Deploy backend
cd ../backend
npm install
npm run build
# Update Lambda functions via AWS CLI

# 3. Deploy frontend
cd ../frontend
npm install
VITE_API_URL=<your-api-url> npm run build
aws s3 sync dist/ s3://<your-bucket> --delete
aws cloudfront create-invalidation --distribution-id <id> --paths "/*"
```

## Monitoring Deployments

- View workflow runs: Actions tab in GitHub
- Check logs for each job
- Review deployment summary in job output

## Troubleshooting

**Terraform state locked:**
- Wait for concurrent operations to complete
- If stuck, manually unlock: `terraform force-unlock <LOCK_ID>`

**Lambda update failed:**
- Check function names match Terraform outputs
- Verify zip files exist in `backend/dist/`

**CloudFront invalidation slow:**
- Normal behavior (can take 10-15 minutes)
- Test with query parameter: `?v=timestamp`

**Build failures:**
- Check Node.js version matches `NODE_VERSION`
- Ensure `package-lock.json` is committed
- Run `npm ci` locally to test
