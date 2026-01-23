# IAM role for Lambda execution
resource "aws_iam_role" "lambda" {
  name = "${var.project_name}-${var.environment}-lambda-exec"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-${var.environment}-lambda-exec"
  }
}

# Attach basic Lambda execution policy
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Policy for DynamoDB access
resource "aws_iam_role_policy" "lambda_dynamodb" {
  name = "${var.project_name}-${var.environment}-lambda-dynamodb"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          var.dynamodb_table_arn,
          "${var.dynamodb_table_arn}/index/*"
        ]
      }
    ]
  })
}

# Lambda function: getQuizzes
resource "aws_lambda_function" "get_quizzes" {
  filename         = "${path.module}/../../../backend/dist/getQuizzes.zip"
  function_name    = "${var.project_name}-${var.environment}-getQuizzes"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 10
  memory_size      = 256
  source_code_hash = fileexists("${path.module}/../../../backend/dist/getQuizzes.zip") ? filebase64sha256("${path.module}/../../../backend/dist/getQuizzes.zip") : null

  environment {
    variables = {
      TABLE_NAME = var.dynamodb_table_name
      NODE_ENV   = var.environment
    }
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-getQuizzes"
  }
}

# Lambda function: getQuiz
resource "aws_lambda_function" "get_quiz" {
  filename         = "${path.module}/../../../backend/dist/getQuiz.zip"
  function_name    = "${var.project_name}-${var.environment}-getQuiz"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 10
  memory_size      = 256
  source_code_hash = fileexists("${path.module}/../../../backend/dist/getQuiz.zip") ? filebase64sha256("${path.module}/../../../backend/dist/getQuiz.zip") : null

  environment {
    variables = {
      TABLE_NAME = var.dynamodb_table_name
      NODE_ENV   = var.environment
    }
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-getQuiz"
  }
}

# Lambda function: getQuestions
resource "aws_lambda_function" "get_questions" {
  filename         = "${path.module}/../../../backend/dist/getQuestions.zip"
  function_name    = "${var.project_name}-${var.environment}-getQuestions"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 10
  memory_size      = 256
  source_code_hash = fileexists("${path.module}/../../../backend/dist/getQuestions.zip") ? filebase64sha256("${path.module}/../../../backend/dist/getQuestions.zip") : null

  environment {
    variables = {
      TABLE_NAME = var.dynamodb_table_name
      NODE_ENV   = var.environment
    }
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-getQuestions"
  }
}

# Lambda function: submitAnswers
resource "aws_lambda_function" "submit_answers" {
  filename         = "${path.module}/../../../backend/dist/submitAnswers.zip"
  function_name    = "${var.project_name}-${var.environment}-submitAnswers"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 10
  memory_size      = 256
  source_code_hash = fileexists("${path.module}/../../../backend/dist/submitAnswers.zip") ? filebase64sha256("${path.module}/../../../backend/dist/submitAnswers.zip") : null

  environment {
    variables = {
      TABLE_NAME = var.dynamodb_table_name
      NODE_ENV   = var.environment
    }
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-submitAnswers"
  }
}

# API Gateway REST API
resource "aws_api_gateway_rest_api" "this" {
  name        = "${var.project_name}-${var.environment}-api"
  description = "LOTG Quiz API"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-api"
  }
}

# API Gateway resource: /quizzes
resource "aws_api_gateway_resource" "quizzes" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  parent_id   = aws_api_gateway_rest_api.this.root_resource_id
  path_part   = "quizzes"
}

# API Gateway resource: /quizzes/{id}
resource "aws_api_gateway_resource" "quiz_id" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  parent_id   = aws_api_gateway_resource.quizzes.id
  path_part   = "{id}"
}

# API Gateway resource: /quizzes/{id}/questions
resource "aws_api_gateway_resource" "questions" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  parent_id   = aws_api_gateway_resource.quiz_id.id
  path_part   = "questions"
}

# API Gateway resource: /quizzes/{id}/submit
resource "aws_api_gateway_resource" "submit" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  parent_id   = aws_api_gateway_resource.quiz_id.id
  path_part   = "submit"
}

# GET /quizzes
resource "aws_api_gateway_method" "get_quizzes" {
  rest_api_id   = aws_api_gateway_rest_api.this.id
  resource_id   = aws_api_gateway_resource.quizzes.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "get_quizzes" {
  rest_api_id             = aws_api_gateway_rest_api.this.id
  resource_id             = aws_api_gateway_resource.quizzes.id
  http_method             = aws_api_gateway_method.get_quizzes.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.get_quizzes.invoke_arn
}

# GET /quizzes/{id}
resource "aws_api_gateway_method" "get_quiz" {
  rest_api_id   = aws_api_gateway_rest_api.this.id
  resource_id   = aws_api_gateway_resource.quiz_id.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "get_quiz" {
  rest_api_id             = aws_api_gateway_rest_api.this.id
  resource_id             = aws_api_gateway_resource.quiz_id.id
  http_method             = aws_api_gateway_method.get_quiz.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.get_quiz.invoke_arn
}

# GET /quizzes/{id}/questions
resource "aws_api_gateway_method" "get_questions" {
  rest_api_id   = aws_api_gateway_rest_api.this.id
  resource_id   = aws_api_gateway_resource.questions.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "get_questions" {
  rest_api_id             = aws_api_gateway_rest_api.this.id
  resource_id             = aws_api_gateway_resource.questions.id
  http_method             = aws_api_gateway_method.get_questions.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.get_questions.invoke_arn
}

# POST /quizzes/{id}/submit
resource "aws_api_gateway_method" "submit_answers" {
  rest_api_id   = aws_api_gateway_rest_api.this.id
  resource_id   = aws_api_gateway_resource.submit.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "submit_answers" {
  rest_api_id             = aws_api_gateway_rest_api.this.id
  resource_id             = aws_api_gateway_resource.submit.id
  http_method             = aws_api_gateway_method.submit_answers.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.submit_answers.invoke_arn
}

# Enable CORS for all methods
module "cors_quizzes" {
  source  = "squidfunk/api-gateway-enable-cors/aws"
  version = "0.3.3"

  api_id          = aws_api_gateway_rest_api.this.id
  api_resource_id = aws_api_gateway_resource.quizzes.id
}

module "cors_quiz_id" {
  source  = "squidfunk/api-gateway-enable-cors/aws"
  version = "0.3.3"

  api_id          = aws_api_gateway_rest_api.this.id
  api_resource_id = aws_api_gateway_resource.quiz_id.id
}

module "cors_questions" {
  source  = "squidfunk/api-gateway-enable-cors/aws"
  version = "0.3.3"

  api_id          = aws_api_gateway_rest_api.this.id
  api_resource_id = aws_api_gateway_resource.questions.id
}

module "cors_submit" {
  source  = "squidfunk/api-gateway-enable-cors/aws"
  version = "0.3.3"

  api_id          = aws_api_gateway_rest_api.this.id
  api_resource_id = aws_api_gateway_resource.submit.id
}

# API Gateway deployment
resource "aws_api_gateway_deployment" "this" {
  rest_api_id = aws_api_gateway_rest_api.this.id

  depends_on = [
    aws_api_gateway_integration.get_quizzes,
    aws_api_gateway_integration.get_quiz,
    aws_api_gateway_integration.get_questions,
    aws_api_gateway_integration.submit_answers,
    aws_api_gateway_integration.post_presigned_url,
    aws_api_gateway_integration.get_jobs,
    aws_api_gateway_integration.get_job,
    aws_api_gateway_integration.get_question_bank,
    aws_api_gateway_integration.review_question,
    aws_api_gateway_integration.bulk_review,
    aws_api_gateway_integration.publish_quiz,
    aws_api_gateway_integration.create_manual_job,
    aws_api_gateway_integration.add_manual_question,
  ]

  lifecycle {
    create_before_destroy = true
  }

  # Trigger redeployment when resources change
  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.quizzes.id,
      aws_api_gateway_resource.submit.id,
      aws_api_gateway_resource.admin.id,
      aws_api_gateway_resource.admin_presigned_url.id,
      aws_api_gateway_resource.admin_jobs.id,
      aws_api_gateway_resource.admin_questions.id,
      aws_api_gateway_resource.admin_jobs_manual.id,
      aws_api_gateway_resource.admin_job_questions.id,
    ]))
  }
}

# API Gateway stage
resource "aws_api_gateway_stage" "this" {
  deployment_id = aws_api_gateway_deployment.this.id
  rest_api_id   = aws_api_gateway_rest_api.this.id
  stage_name    = var.environment
}

# Lambda permissions for API Gateway
resource "aws_lambda_permission" "get_quizzes" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_quizzes.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.this.execution_arn}/*/*"
}

resource "aws_lambda_permission" "get_quiz" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_quiz.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.this.execution_arn}/*/*"
}

resource "aws_lambda_permission" "get_questions" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_questions.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.this.execution_arn}/*/*"
}

resource "aws_lambda_permission" "submit_answers" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.submit_answers.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.this.execution_arn}/*/*"
}

# ============================================================================
# PDF Upload S3 Bucket
# ============================================================================

resource "aws_s3_bucket" "pdf_uploads" {
  bucket = "${var.project_name}-${var.environment}-pdf-uploads"

  tags = {
    Name = "${var.project_name}-${var.environment}-pdf-uploads"
  }
}

resource "aws_s3_bucket_versioning" "pdf_uploads" {
  bucket = aws_s3_bucket.pdf_uploads.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "pdf_uploads" {
  bucket = aws_s3_bucket.pdf_uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "pdf_uploads" {
  bucket = aws_s3_bucket.pdf_uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "pdf_uploads" {
  bucket = aws_s3_bucket.pdf_uploads.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "POST", "GET"]
    allowed_origins = ["*"] # In production, restrict to CloudFront domain
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# ============================================================================
# Secrets Manager for Claude API Key
# ============================================================================

resource "aws_secretsmanager_secret" "claude_api_key" {
  name        = "${var.project_name}-${var.environment}-claude-api-key"
  description = "Claude API key for PDF question extraction"

  tags = {
    Name = "${var.project_name}-${var.environment}-claude-api-key"
  }
}

# ============================================================================
# IAM Role for Admin Lambda Functions
# ============================================================================

resource "aws_iam_role" "lambda_admin" {
  name = "${var.project_name}-${var.environment}-lambda-admin-exec"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-${var.environment}-lambda-admin-exec"
  }
}

resource "aws_iam_role_policy_attachment" "lambda_admin_basic" {
  role       = aws_iam_role.lambda_admin.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Policy for S3 access (PDF uploads)
resource "aws_iam_role_policy" "lambda_admin_s3" {
  name = "${var.project_name}-${var.environment}-lambda-admin-s3"
  role = aws_iam_role.lambda_admin.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.pdf_uploads.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.pdf_uploads.arn
      }
    ]
  })
}

# Policy for DynamoDB access (read/write for admin operations)
resource "aws_iam_role_policy" "lambda_admin_dynamodb" {
  name = "${var.project_name}-${var.environment}-lambda-admin-dynamodb"
  role = aws_iam_role.lambda_admin.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchWriteItem",
          "dynamodb:BatchGetItem"
        ]
        Resource = [
          var.dynamodb_table_arn,
          "${var.dynamodb_table_arn}/index/*"
        ]
      }
    ]
  })
}

# Policy for Secrets Manager access (Claude API key)
resource "aws_iam_role_policy" "lambda_admin_secrets" {
  name = "${var.project_name}-${var.environment}-lambda-admin-secrets"
  role = aws_iam_role.lambda_admin.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = aws_secretsmanager_secret.claude_api_key.arn
      }
    ]
  })
}

# ============================================================================
# Lambda Function: generatePresignedUrl
# ============================================================================

resource "aws_lambda_function" "generate_presigned_url" {
  filename         = "${path.module}/../../../backend/dist/generatePresignedUrl.zip"
  function_name    = "${var.project_name}-${var.environment}-generatePresignedUrl"
  role             = aws_iam_role.lambda_admin.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 10
  memory_size      = 256
  source_code_hash = fileexists("${path.module}/../../../backend/dist/generatePresignedUrl.zip") ? filebase64sha256("${path.module}/../../../backend/dist/generatePresignedUrl.zip") : null

  environment {
    variables = {
      TABLE_NAME  = var.dynamodb_table_name
      BUCKET_NAME = aws_s3_bucket.pdf_uploads.id
      NODE_ENV    = var.environment
    }
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-generatePresignedUrl"
  }
}

# ============================================================================
# Lambda Function: processPdf
# ============================================================================

resource "aws_lambda_function" "process_pdf" {
  filename         = "${path.module}/../../../backend/dist/processPdf.zip"
  function_name    = "${var.project_name}-${var.environment}-processPdf"
  role             = aws_iam_role.lambda_admin.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 300  # 5 minutes for PDF processing
  memory_size      = 1024 # More memory for PDF/image processing
  source_code_hash = fileexists("${path.module}/../../../backend/dist/processPdf.zip") ? filebase64sha256("${path.module}/../../../backend/dist/processPdf.zip") : null

  environment {
    variables = {
      TABLE_NAME  = var.dynamodb_table_name
      BUCKET_NAME = aws_s3_bucket.pdf_uploads.id
      SECRET_NAME = aws_secretsmanager_secret.claude_api_key.name
      NODE_ENV    = var.environment
    }
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-processPdf"
  }
}

# S3 event trigger for processPdf Lambda
resource "aws_lambda_permission" "s3_invoke_process_pdf" {
  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.process_pdf.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.pdf_uploads.arn
}

resource "aws_s3_bucket_notification" "pdf_upload_trigger" {
  bucket = aws_s3_bucket.pdf_uploads.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.process_pdf.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "uploads/"
    filter_suffix       = ".pdf"
  }

  depends_on = [aws_lambda_permission.s3_invoke_process_pdf]
}

# ============================================================================
# Lambda Function: getQuestionBank
# ============================================================================

resource "aws_lambda_function" "get_question_bank" {
  filename         = "${path.module}/../../../backend/dist/getQuestionBank.zip"
  function_name    = "${var.project_name}-${var.environment}-getQuestionBank"
  role             = aws_iam_role.lambda_admin.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 10
  memory_size      = 256
  source_code_hash = fileexists("${path.module}/../../../backend/dist/getQuestionBank.zip") ? filebase64sha256("${path.module}/../../../backend/dist/getQuestionBank.zip") : null

  environment {
    variables = {
      TABLE_NAME = var.dynamodb_table_name
      NODE_ENV   = var.environment
    }
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-getQuestionBank"
  }
}

# ============================================================================
# Lambda Function: reviewQuestion
# ============================================================================

resource "aws_lambda_function" "review_question" {
  filename         = "${path.module}/../../../backend/dist/reviewQuestion.zip"
  function_name    = "${var.project_name}-${var.environment}-reviewQuestion"
  role             = aws_iam_role.lambda_admin.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 10
  memory_size      = 256
  source_code_hash = fileexists("${path.module}/../../../backend/dist/reviewQuestion.zip") ? filebase64sha256("${path.module}/../../../backend/dist/reviewQuestion.zip") : null

  environment {
    variables = {
      TABLE_NAME = var.dynamodb_table_name
      NODE_ENV   = var.environment
    }
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-reviewQuestion"
  }
}

# ============================================================================
# Lambda Function: bulkReviewQuestions
# ============================================================================

resource "aws_lambda_function" "bulk_review_questions" {
  filename         = "${path.module}/../../../backend/dist/bulkReviewQuestions.zip"
  function_name    = "${var.project_name}-${var.environment}-bulkReviewQuestions"
  role             = aws_iam_role.lambda_admin.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 30 # Longer timeout for batch operations
  memory_size      = 256
  source_code_hash = fileexists("${path.module}/../../../backend/dist/bulkReviewQuestions.zip") ? filebase64sha256("${path.module}/../../../backend/dist/bulkReviewQuestions.zip") : null

  environment {
    variables = {
      TABLE_NAME = var.dynamodb_table_name
      NODE_ENV   = var.environment
    }
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-bulkReviewQuestions"
  }
}

# ============================================================================
# Lambda Function: publishQuiz
# ============================================================================

resource "aws_lambda_function" "publish_quiz" {
  filename         = "${path.module}/../../../backend/dist/publishQuiz.zip"
  function_name    = "${var.project_name}-${var.environment}-publishQuiz"
  role             = aws_iam_role.lambda_admin.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 10
  memory_size      = 256
  source_code_hash = fileexists("${path.module}/../../../backend/dist/publishQuiz.zip") ? filebase64sha256("${path.module}/../../../backend/dist/publishQuiz.zip") : null

  environment {
    variables = {
      TABLE_NAME = var.dynamodb_table_name
      NODE_ENV   = var.environment
    }
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-publishQuiz"
  }
}

# ============================================================================
# Lambda Function: getExtractionJobs
# ============================================================================

resource "aws_lambda_function" "get_extraction_jobs" {
  filename         = "${path.module}/../../../backend/dist/getExtractionJobs.zip"
  function_name    = "${var.project_name}-${var.environment}-getExtractionJobs"
  role             = aws_iam_role.lambda_admin.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 10
  memory_size      = 256
  source_code_hash = fileexists("${path.module}/../../../backend/dist/getExtractionJobs.zip") ? filebase64sha256("${path.module}/../../../backend/dist/getExtractionJobs.zip") : null

  environment {
    variables = {
      TABLE_NAME = var.dynamodb_table_name
      NODE_ENV   = var.environment
    }
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-getExtractionJobs"
  }
}

# ============================================================================
# API Gateway: Admin Routes
# ============================================================================

# /admin resource
resource "aws_api_gateway_resource" "admin" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  parent_id   = aws_api_gateway_rest_api.this.root_resource_id
  path_part   = "admin"
}

# /admin/upload resource
resource "aws_api_gateway_resource" "admin_upload" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  parent_id   = aws_api_gateway_resource.admin.id
  path_part   = "upload"
}

# /admin/upload/presigned-url
resource "aws_api_gateway_resource" "admin_presigned_url" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  parent_id   = aws_api_gateway_resource.admin_upload.id
  path_part   = "presigned-url"
}

# POST /admin/upload/presigned-url
resource "aws_api_gateway_method" "post_presigned_url" {
  rest_api_id   = aws_api_gateway_rest_api.this.id
  resource_id   = aws_api_gateway_resource.admin_presigned_url.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "post_presigned_url" {
  rest_api_id             = aws_api_gateway_rest_api.this.id
  resource_id             = aws_api_gateway_resource.admin_presigned_url.id
  http_method             = aws_api_gateway_method.post_presigned_url.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.generate_presigned_url.invoke_arn
}

# /admin/jobs resource
resource "aws_api_gateway_resource" "admin_jobs" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  parent_id   = aws_api_gateway_resource.admin.id
  path_part   = "jobs"
}

# GET /admin/jobs
resource "aws_api_gateway_method" "get_jobs" {
  rest_api_id   = aws_api_gateway_rest_api.this.id
  resource_id   = aws_api_gateway_resource.admin_jobs.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "get_jobs" {
  rest_api_id             = aws_api_gateway_rest_api.this.id
  resource_id             = aws_api_gateway_resource.admin_jobs.id
  http_method             = aws_api_gateway_method.get_jobs.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.get_extraction_jobs.invoke_arn
}

# /admin/jobs/{id}
resource "aws_api_gateway_resource" "admin_job_id" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  parent_id   = aws_api_gateway_resource.admin_jobs.id
  path_part   = "{id}"
}

# GET /admin/jobs/{id}
resource "aws_api_gateway_method" "get_job" {
  rest_api_id   = aws_api_gateway_rest_api.this.id
  resource_id   = aws_api_gateway_resource.admin_job_id.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "get_job" {
  rest_api_id             = aws_api_gateway_rest_api.this.id
  resource_id             = aws_api_gateway_resource.admin_job_id.id
  http_method             = aws_api_gateway_method.get_job.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.get_extraction_jobs.invoke_arn
}

# /admin/jobs/{id}/publish
resource "aws_api_gateway_resource" "admin_job_publish" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  parent_id   = aws_api_gateway_resource.admin_job_id.id
  path_part   = "publish"
}

# PUT /admin/jobs/{id}/publish
resource "aws_api_gateway_method" "publish_quiz" {
  rest_api_id   = aws_api_gateway_rest_api.this.id
  resource_id   = aws_api_gateway_resource.admin_job_publish.id
  http_method   = "PUT"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "publish_quiz" {
  rest_api_id             = aws_api_gateway_rest_api.this.id
  resource_id             = aws_api_gateway_resource.admin_job_publish.id
  http_method             = aws_api_gateway_method.publish_quiz.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.publish_quiz.invoke_arn
}

# /admin/questions resource
resource "aws_api_gateway_resource" "admin_questions" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  parent_id   = aws_api_gateway_resource.admin.id
  path_part   = "questions"
}

# GET /admin/questions
resource "aws_api_gateway_method" "get_question_bank" {
  rest_api_id   = aws_api_gateway_rest_api.this.id
  resource_id   = aws_api_gateway_resource.admin_questions.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "get_question_bank" {
  rest_api_id             = aws_api_gateway_rest_api.this.id
  resource_id             = aws_api_gateway_resource.admin_questions.id
  http_method             = aws_api_gateway_method.get_question_bank.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.get_question_bank.invoke_arn
}

# /admin/questions/{id}
resource "aws_api_gateway_resource" "admin_question_id" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  parent_id   = aws_api_gateway_resource.admin_questions.id
  path_part   = "{id}"
}

# /admin/questions/{id}/review
resource "aws_api_gateway_resource" "admin_question_review" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  parent_id   = aws_api_gateway_resource.admin_question_id.id
  path_part   = "review"
}

# PUT /admin/questions/{id}/review
resource "aws_api_gateway_method" "review_question" {
  rest_api_id   = aws_api_gateway_rest_api.this.id
  resource_id   = aws_api_gateway_resource.admin_question_review.id
  http_method   = "PUT"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "review_question" {
  rest_api_id             = aws_api_gateway_rest_api.this.id
  resource_id             = aws_api_gateway_resource.admin_question_review.id
  http_method             = aws_api_gateway_method.review_question.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.review_question.invoke_arn
}

# /admin/questions/bulk-review
resource "aws_api_gateway_resource" "admin_bulk_review" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  parent_id   = aws_api_gateway_resource.admin_questions.id
  path_part   = "bulk-review"
}

# POST /admin/questions/bulk-review
resource "aws_api_gateway_method" "bulk_review" {
  rest_api_id   = aws_api_gateway_rest_api.this.id
  resource_id   = aws_api_gateway_resource.admin_bulk_review.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "bulk_review" {
  rest_api_id             = aws_api_gateway_rest_api.this.id
  resource_id             = aws_api_gateway_resource.admin_bulk_review.id
  http_method             = aws_api_gateway_method.bulk_review.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.bulk_review_questions.invoke_arn
}

# CORS for admin routes
module "cors_admin" {
  source  = "squidfunk/api-gateway-enable-cors/aws"
  version = "0.3.3"

  api_id          = aws_api_gateway_rest_api.this.id
  api_resource_id = aws_api_gateway_resource.admin.id
}

module "cors_admin_presigned_url" {
  source  = "squidfunk/api-gateway-enable-cors/aws"
  version = "0.3.3"

  api_id          = aws_api_gateway_rest_api.this.id
  api_resource_id = aws_api_gateway_resource.admin_presigned_url.id
}

module "cors_admin_jobs" {
  source  = "squidfunk/api-gateway-enable-cors/aws"
  version = "0.3.3"

  api_id          = aws_api_gateway_rest_api.this.id
  api_resource_id = aws_api_gateway_resource.admin_jobs.id
}

module "cors_admin_job_id" {
  source  = "squidfunk/api-gateway-enable-cors/aws"
  version = "0.3.3"

  api_id          = aws_api_gateway_rest_api.this.id
  api_resource_id = aws_api_gateway_resource.admin_job_id.id
}

module "cors_admin_job_publish" {
  source  = "squidfunk/api-gateway-enable-cors/aws"
  version = "0.3.3"

  api_id          = aws_api_gateway_rest_api.this.id
  api_resource_id = aws_api_gateway_resource.admin_job_publish.id
}

module "cors_admin_questions" {
  source  = "squidfunk/api-gateway-enable-cors/aws"
  version = "0.3.3"

  api_id          = aws_api_gateway_rest_api.this.id
  api_resource_id = aws_api_gateway_resource.admin_questions.id
}

module "cors_admin_question_review" {
  source  = "squidfunk/api-gateway-enable-cors/aws"
  version = "0.3.3"

  api_id          = aws_api_gateway_rest_api.this.id
  api_resource_id = aws_api_gateway_resource.admin_question_review.id
}

module "cors_admin_bulk_review" {
  source  = "squidfunk/api-gateway-enable-cors/aws"
  version = "0.3.3"

  api_id          = aws_api_gateway_rest_api.this.id
  api_resource_id = aws_api_gateway_resource.admin_bulk_review.id
}

# ============================================================================
# Lambda Function: createManualJob
# ============================================================================

resource "aws_lambda_function" "create_manual_job" {
  filename         = "${path.module}/../../../backend/dist/createManualJob.zip"
  function_name    = "${var.project_name}-${var.environment}-createManualJob"
  role             = aws_iam_role.lambda_admin.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 10
  memory_size      = 256
  source_code_hash = fileexists("${path.module}/../../../backend/dist/createManualJob.zip") ? filebase64sha256("${path.module}/../../../backend/dist/createManualJob.zip") : null

  environment {
    variables = {
      TABLE_NAME = var.dynamodb_table_name
      NODE_ENV   = var.environment
    }
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-createManualJob"
  }
}

# ============================================================================
# Lambda Function: addManualQuestion
# ============================================================================

resource "aws_lambda_function" "add_manual_question" {
  filename         = "${path.module}/../../../backend/dist/addManualQuestion.zip"
  function_name    = "${var.project_name}-${var.environment}-addManualQuestion"
  role             = aws_iam_role.lambda_admin.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 10
  memory_size      = 256
  source_code_hash = fileexists("${path.module}/../../../backend/dist/addManualQuestion.zip") ? filebase64sha256("${path.module}/../../../backend/dist/addManualQuestion.zip") : null

  environment {
    variables = {
      TABLE_NAME = var.dynamodb_table_name
      NODE_ENV   = var.environment
    }
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-addManualQuestion"
  }
}

# /admin/jobs/manual resource
resource "aws_api_gateway_resource" "admin_jobs_manual" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  parent_id   = aws_api_gateway_resource.admin_jobs.id
  path_part   = "manual"
}

# POST /admin/jobs/manual
resource "aws_api_gateway_method" "create_manual_job" {
  rest_api_id   = aws_api_gateway_rest_api.this.id
  resource_id   = aws_api_gateway_resource.admin_jobs_manual.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "create_manual_job" {
  rest_api_id             = aws_api_gateway_rest_api.this.id
  resource_id             = aws_api_gateway_resource.admin_jobs_manual.id
  http_method             = aws_api_gateway_method.create_manual_job.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.create_manual_job.invoke_arn
}

# /admin/jobs/{id}/questions resource
resource "aws_api_gateway_resource" "admin_job_questions" {
  rest_api_id = aws_api_gateway_rest_api.this.id
  parent_id   = aws_api_gateway_resource.admin_job_id.id
  path_part   = "questions"
}

# POST /admin/jobs/{id}/questions
resource "aws_api_gateway_method" "add_manual_question" {
  rest_api_id   = aws_api_gateway_rest_api.this.id
  resource_id   = aws_api_gateway_resource.admin_job_questions.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "add_manual_question" {
  rest_api_id             = aws_api_gateway_rest_api.this.id
  resource_id             = aws_api_gateway_resource.admin_job_questions.id
  http_method             = aws_api_gateway_method.add_manual_question.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.add_manual_question.invoke_arn
}

# CORS for new routes
module "cors_admin_jobs_manual" {
  source  = "squidfunk/api-gateway-enable-cors/aws"
  version = "0.3.3"

  api_id          = aws_api_gateway_rest_api.this.id
  api_resource_id = aws_api_gateway_resource.admin_jobs_manual.id
}

module "cors_admin_job_questions" {
  source  = "squidfunk/api-gateway-enable-cors/aws"
  version = "0.3.3"

  api_id          = aws_api_gateway_rest_api.this.id
  api_resource_id = aws_api_gateway_resource.admin_job_questions.id
}

# Lambda permissions for new functions
resource "aws_lambda_permission" "create_manual_job" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.create_manual_job.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.this.execution_arn}/*/*"
}

resource "aws_lambda_permission" "add_manual_question" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.add_manual_question.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.this.execution_arn}/*/*"
}

# Lambda permissions for API Gateway (admin functions)
resource "aws_lambda_permission" "generate_presigned_url" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.generate_presigned_url.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.this.execution_arn}/*/*"
}

resource "aws_lambda_permission" "get_question_bank" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_question_bank.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.this.execution_arn}/*/*"
}

resource "aws_lambda_permission" "review_question" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.review_question.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.this.execution_arn}/*/*"
}

resource "aws_lambda_permission" "bulk_review_questions" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.bulk_review_questions.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.this.execution_arn}/*/*"
}

resource "aws_lambda_permission" "get_extraction_jobs" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_extraction_jobs.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.this.execution_arn}/*/*"
}

resource "aws_lambda_permission" "publish_quiz" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.publish_quiz.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.this.execution_arn}/*/*"
}

