output "cloudfront_url" {
  description = "CloudFront distribution URL for the frontend"
  value       = try(module.frontend.cloudfront_url, "")
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = try(module.frontend.cloudfront_distribution_id, "")
}

output "s3_bucket_name" {
  description = "S3 bucket name for frontend hosting"
  value       = try(module.frontend.s3_bucket_name, "")
}

output "api_gateway_url" {
  description = "API Gateway endpoint URL"
  value       = try(module.backend.api_gateway_url, "")
}

output "dynamodb_table_name" {
  description = "DynamoDB table name"
  value       = try(module.database.table_name, "")
}

output "lambda_function_names" {
  description = "Lambda function names"
  value       = try(module.backend.lambda_function_names, {})
}
