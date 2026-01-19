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
