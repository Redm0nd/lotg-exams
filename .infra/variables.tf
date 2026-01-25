variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"

  validation {
    condition     = can(regex("^[a-z]{2}-[a-z]+-[0-9]$", var.aws_region))
    error_message = "AWS region must be a valid region format (e.g., us-east-1, eu-west-2)."
  }

  nullable = false
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "lotg-exams"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project_name)) && length(var.project_name) <= 32
    error_message = "Project name must contain only lowercase letters, numbers, and hyphens, and be at most 32 characters."
  }

  nullable = false
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }

  nullable = false
}

variable "auth0_domain" {
  description = "Auth0 domain (e.g., your-tenant.auth0.com)"
  type        = string
  nullable    = false
}

variable "auth0_audience" {
  description = "Auth0 API audience identifier"
  type        = string
  nullable    = false
}
