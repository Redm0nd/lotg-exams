variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  nullable    = false
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  nullable    = false

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "dynamodb_table_name" {
  description = "DynamoDB table name for Lambda environment variables"
  type        = string
  nullable    = false
}

variable "dynamodb_table_arn" {
  description = "DynamoDB table ARN for IAM policy"
  type        = string
  nullable    = false
}
