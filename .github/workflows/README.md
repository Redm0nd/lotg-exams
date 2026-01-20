# GitHub Actions Workflows

This directory contains CI/CD workflows for the LOTG Exams application.

## Workflows

### deploy.yml

Handles complete deployment of infrastructure and application using OIDC authentication.

**Triggers:**
- Pull Request to `main`: Runs Terraform plan (if infra changes detected)
- Push to `main`: Deploys infrastructure and application

**Jobs:**

1. **changes** (always runs)
   - Detects which folders have changes using `dorny/paths-filter`
   - Outputs: `infra`, `backend`, `frontend` flags
   - Subsequent jobs only run if their folder has changes

2. **terraform-plan** (if `.infra/` changed)
   - Validates Terraform configuration
   - Generates execution plan
   - Outputs plan to job summary

3. **terraform-apply** (main only, requires approval)
   - Requires manual approval via "production" environment
   - Applies Terraform changes using saved plan
   - Only runs if infrastructure has changes

4. **get-outputs** (main only)
   - Retrieves Terraform outputs for deployment jobs
   - Runs after apply or independently if only app code changed

5. **deploy-backend** (main only, if `backend/` changed)
   - Builds Lambda functions (10 total)
   - Updates function code in AWS

6. **deploy-frontend** (main only, if `frontend/` changed)
   - Builds React application
   - Syncs to S3
   - Invalidates CloudFront cache

7. **deployment-summary** (main only)
   - Posts deployment summary to GitHub

## Authentication: OIDC (OpenID Connect)

This workflow uses OIDC authentication for secure, keyless AWS access. No long-lived credentials are stored in GitHub secrets.

### How OIDC Works

1. GitHub Actions requests a short-lived OIDC token
2. Token is exchanged with AWS STS for temporary credentials
3. Credentials are valid only for the workflow run duration

### Required GitHub Setup

**Secret:**
- `AWS_ACCOUNT_ID` - Your 12-digit AWS account ID

**Environment:**
- Create a "production" environment in Settings → Environments
- Add required reviewers for terraform-apply approval
- This environment gates infrastructure changes

### AWS Setup

The Terraform infrastructure creates the required IAM role automatically:

```
Role: arn:aws:iam::${AWS_ACCOUNT_ID}:role/lotg-exams-github-actions
```

This role trusts GitHub's OIDC provider and allows the workflow to assume it.

If setting up manually, see: https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services

## Path-Based Filtering

The workflow uses intelligent change detection to avoid unnecessary deployments:

| Folder Changed | Jobs That Run |
|----------------|---------------|
| `.infra/**` | terraform-plan, terraform-apply |
| `backend/**` | deploy-backend |
| `frontend/**` | deploy-frontend |

Multiple folders can change in one commit, triggering multiple deployment jobs.

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
- terraform-apply requires approval before running

## Troubleshooting

**Terraform state locked:**
- Wait for concurrent operations to complete
- If stuck, manually unlock: `terraform force-unlock <LOCK_ID>`

**OIDC authentication failed:**
- Verify `AWS_ACCOUNT_ID` secret is set correctly (12 digits, no dashes)
- Check IAM role trust policy includes your GitHub repository
- Ensure "production" environment exists if terraform-apply fails

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

**terraform-apply not running:**
- Check that "production" environment has required reviewers configured
- Approve the deployment in the GitHub Actions UI
