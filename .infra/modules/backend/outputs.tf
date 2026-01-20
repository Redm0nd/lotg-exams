output "api_gateway_url" {
  description = "API Gateway endpoint URL"
  value       = aws_api_gateway_stage.this.invoke_url
}

output "api_gateway_id" {
  description = "API Gateway REST API ID"
  value       = aws_api_gateway_rest_api.this.id
}

output "api_gateway_execution_arn" {
  description = "API Gateway execution ARN"
  value       = aws_api_gateway_rest_api.this.execution_arn
}

output "lambda_function_names" {
  description = "Lambda function names"
  value = {
    get_quizzes            = aws_lambda_function.get_quizzes.function_name
    get_quiz               = aws_lambda_function.get_quiz.function_name
    get_questions          = aws_lambda_function.get_questions.function_name
    generate_presigned_url = aws_lambda_function.generate_presigned_url.function_name
    process_pdf            = aws_lambda_function.process_pdf.function_name
    get_question_bank      = aws_lambda_function.get_question_bank.function_name
    review_question        = aws_lambda_function.review_question.function_name
    bulk_review_questions  = aws_lambda_function.bulk_review_questions.function_name
    get_extraction_jobs    = aws_lambda_function.get_extraction_jobs.function_name
    create_manual_job      = aws_lambda_function.create_manual_job.function_name
    add_manual_question    = aws_lambda_function.add_manual_question.function_name
  }
}

output "lambda_function_arns" {
  description = "Lambda function ARNs"
  value = {
    get_quizzes            = aws_lambda_function.get_quizzes.arn
    get_quiz               = aws_lambda_function.get_quiz.arn
    get_questions          = aws_lambda_function.get_questions.arn
    generate_presigned_url = aws_lambda_function.generate_presigned_url.arn
    process_pdf            = aws_lambda_function.process_pdf.arn
    get_question_bank      = aws_lambda_function.get_question_bank.arn
    review_question        = aws_lambda_function.review_question.arn
    bulk_review_questions  = aws_lambda_function.bulk_review_questions.arn
    get_extraction_jobs    = aws_lambda_function.get_extraction_jobs.arn
    create_manual_job      = aws_lambda_function.create_manual_job.arn
    add_manual_question    = aws_lambda_function.add_manual_question.arn
  }
}

output "pdf_uploads_bucket_name" {
  description = "S3 bucket name for PDF uploads"
  value       = aws_s3_bucket.pdf_uploads.id
}

output "pdf_uploads_bucket_arn" {
  description = "S3 bucket ARN for PDF uploads"
  value       = aws_s3_bucket.pdf_uploads.arn
}

output "claude_api_key_secret_arn" {
  description = "Secrets Manager secret ARN for Claude API key"
  value       = aws_secretsmanager_secret.claude_api_key.arn
}
