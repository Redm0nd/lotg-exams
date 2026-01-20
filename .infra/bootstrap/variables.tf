variable "aws_region" {
  description = "AWS region for the Terraform state resources"
  type        = string
  default     = "us-east-1"

  nullable = false
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "lotg-exams"

  nullable = false
}

variable "github_org" {
  description = "GitHub organization or username"
  type        = string
  default     = "Redm0nd"  # Update this to your GitHub org/username

  nullable = false
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
  default     = "lotg-exams"

  nullable = false
}
