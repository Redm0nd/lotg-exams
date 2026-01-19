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

# API Gateway deployment
resource "aws_api_gateway_deployment" "this" {
  rest_api_id = aws_api_gateway_rest_api.this.id

  depends_on = [
    aws_api_gateway_integration.get_quizzes,
    aws_api_gateway_integration.get_quiz,
    aws_api_gateway_integration.get_questions,
  ]

  lifecycle {
    create_before_destroy = true
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
