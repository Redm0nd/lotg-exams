provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "lotg-exams"
      ManagedBy   = "terraform"
      Environment = var.environment
    }
  }
}

# Database module - DynamoDB table
module "database" {
  source = "./modules/database"

  project_name = var.project_name
  environment  = var.environment
}

# Backend module - API Gateway + Lambda functions
module "backend" {
  source = "./modules/backend"

  project_name        = var.project_name
  environment         = var.environment
  dynamodb_table_name = module.database.table_name
  dynamodb_table_arn  = module.database.table_arn
}

# Frontend module - S3 + CloudFront
module "frontend" {
  source = "./modules/frontend"

  project_name    = var.project_name
  environment     = var.environment
  api_gateway_url = module.backend.api_gateway_url
}
