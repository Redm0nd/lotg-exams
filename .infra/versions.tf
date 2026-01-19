terraform {
  required_version = "~> 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # S3 backend for state management
  # Run `terraform apply` in ./bootstrap first to create these resources
  backend "s3" {
    bucket         = "lotg-exams-terraform-state"
    key            = "terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "lotg-exams-terraform-locks"
  }
}
