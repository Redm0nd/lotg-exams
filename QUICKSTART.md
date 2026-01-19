# Quick Start Guide

Get the LOTG Exams application running in 15 minutes.

## Prerequisites Checklist

- [ ] Node.js 20.x installed (`node --version`)
- [ ] AWS CLI installed and configured (`aws --version`)
- [ ] Terraform 1.6+ installed (`terraform --version`)
- [ ] AWS account with appropriate permissions

## Step-by-Step Deployment

### 1. Install Dependencies (2 minutes)

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Install scripts dependencies
cd ../scripts
npm install
```

### 2. Deploy Infrastructure (5-8 minutes)

```bash
cd .infra

# Create terraform.tfvars
cat > terraform.tfvars <<EOF
aws_region   = "us-east-1"
project_name = "lotg-exams"
environment  = "prod"
EOF

# Deploy (will take ~5-8 minutes for CloudFront)
terraform init
terraform apply -auto-approve

# Save outputs
terraform output > outputs.txt
```

**Note:** CloudFront distribution deployment takes 5-8 minutes.

### 3. Build Backend (1 minute)

```bash
cd ../backend
npm run build

# Verify zip files created
ls -lh dist/*.zip
```

### 4. Deploy Lambda Functions (1 minute)

```bash
# Get function names from Terraform
cd ../.infra
FUNC_GET_QUIZZES=$(terraform output -json lambda_function_names | jq -r '.get_quizzes')
FUNC_GET_QUIZ=$(terraform output -json lambda_function_names | jq -r '.get_quiz')
FUNC_GET_QUESTIONS=$(terraform output -json lambda_function_names | jq -r '.get_questions')

# Update functions
cd ../backend
aws lambda update-function-code \
  --function-name $FUNC_GET_QUIZZES \
  --zip-file fileb://dist/getQuizzes.zip

aws lambda update-function-code \
  --function-name $FUNC_GET_QUIZ \
  --zip-file fileb://dist/getQuiz.zip

aws lambda update-function-code \
  --function-name $FUNC_GET_QUESTIONS \
  --zip-file fileb://dist/getQuestions.zip
```

### 5. Seed Database (1 minute)

```bash
cd ../scripts

# Set table name from Terraform output
export TABLE_NAME=$(cd ../.infra && terraform output -raw dynamodb_table_name)

# Seed with sample data
npm run seed
```

### 6. Build & Deploy Frontend (2 minutes)

```bash
cd ../frontend

# Get API URL and bucket name
API_URL=$(cd ../.infra && terraform output -raw api_gateway_url)
BUCKET_NAME=$(cd ../.infra && terraform output -raw s3_bucket_name)
CLOUDFRONT_ID=$(cd ../.infra && terraform output -raw cloudfront_distribution_id)

# Create .env
echo "VITE_API_URL=$API_URL" > .env

# Build
npm run build

# Deploy to S3
aws s3 sync dist/ s3://$BUCKET_NAME --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id $CLOUDFRONT_ID \
  --paths "/*"
```

### 7. Access Application

```bash
# Get CloudFront URL
cd ../.infra
terraform output cloudfront_url
```

Open the URL in your browser and start taking quizzes!

## Verification

Test each component:

```bash
# Test API
API_URL=$(cd .infra && terraform output -raw api_gateway_url)
curl $API_URL/quizzes

# Check Lambda logs
aws logs tail /aws/lambda/lotg-exams-prod-getQuizzes --follow

# Check DynamoDB data
TABLE_NAME=$(cd .infra && terraform output -raw dynamodb_table_name)
aws dynamodb scan --table-name $TABLE_NAME --limit 5
```

## One-Line Deploy (After First Setup)

```bash
# Deploy everything
cd backend && npm run build && cd ../frontend && npm run build && \
cd ../.infra && terraform apply -auto-approve && \
aws lambda update-function-code --function-name lotg-exams-prod-getQuizzes --zip-file fileb://../backend/dist/getQuizzes.zip && \
aws lambda update-function-code --function-name lotg-exams-prod-getQuiz --zip-file fileb://../backend/dist/getQuiz.zip && \
aws lambda update-function-code --function-name lotg-exams-prod-getQuestions --zip-file fileb://../backend/dist/getQuestions.zip && \
aws s3 sync ../frontend/dist/ s3://$(terraform output -raw s3_bucket_name) --delete && \
aws cloudfront create-invalidation --distribution-id $(terraform output -raw cloudfront_distribution_id) --paths "/*"
```

## Troubleshooting

### Issue: Terraform apply fails

**Solution:**
- Check AWS credentials: `aws sts get-caller-identity`
- Verify IAM permissions
- Check region availability

### Issue: Lambda functions not working

**Solution:**
- Check zip files exist: `ls backend/dist/*.zip`
- Verify function names: `cd .infra && terraform output lambda_function_names`
- Check CloudWatch logs

### Issue: Frontend shows API errors

**Solution:**
- Verify API URL in `.env`: `cat frontend/.env`
- Test API directly: `curl $API_URL/quizzes`
- Check CORS settings in backend module

### Issue: Database empty

**Solution:**
- Re-run seed script: `cd scripts && npm run seed`
- Verify table name: `cd .infra && terraform output dynamodb_table_name`
- Check AWS console DynamoDB

## Next Steps

- [ ] Set up GitHub Actions (see `.github/workflows/README.md`)
- [ ] Add custom domain with Route53
- [ ] Create more quiz content
- [ ] Enable monitoring and alarms
- [ ] Set up backup strategy

## Clean Up

To destroy all resources:

```bash
cd .infra
terraform destroy -auto-approve
```

**Warning:** This deletes everything including quiz data.

## Cost Monitoring

```bash
# Check current month costs
aws ce get-cost-and-usage \
  --time-period Start=$(date -u +%Y-%m-01),End=$(date -u +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --group-by Type=SERVICE

# Set billing alarm
aws cloudwatch put-metric-alarm \
  --alarm-name lotg-exams-billing \
  --alarm-description "Alert when monthly costs exceed $10" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 21600 \
  --evaluation-periods 1 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold
```

## Support

- Documentation: See `README.md`
- Issues: https://github.com/yourusername/lotg-exams/issues
- Contributing: See `CONTRIBUTING.md`
