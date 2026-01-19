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
    get_quizzes   = aws_lambda_function.get_quizzes.function_name
    get_quiz      = aws_lambda_function.get_quiz.function_name
    get_questions = aws_lambda_function.get_questions.function_name
  }
}

output "lambda_function_arns" {
  description = "Lambda function ARNs"
  value = {
    get_quizzes   = aws_lambda_function.get_quizzes.arn
    get_quiz      = aws_lambda_function.get_quiz.arn
    get_questions = aws_lambda_function.get_questions.arn
  }
}
