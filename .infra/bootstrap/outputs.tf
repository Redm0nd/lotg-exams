output "state_bucket_name" {
  description = "S3 bucket name for Terraform state"
  value       = aws_s3_bucket.terraform_state.id
}

output "state_bucket_arn" {
  description = "S3 bucket ARN for Terraform state"
  value       = aws_s3_bucket.terraform_state.arn
}

output "locks_table_name" {
  description = "DynamoDB table name for state locking"
  value       = aws_dynamodb_table.terraform_locks.name
}

output "locks_table_arn" {
  description = "DynamoDB table ARN for state locking"
  value       = aws_dynamodb_table.terraform_locks.arn
}

output "backend_config" {
  description = "Backend configuration to use in versions.tf"
  value       = <<-EOT
    backend "s3" {
      bucket         = "${aws_s3_bucket.terraform_state.id}"
      key            = "terraform.tfstate"
      region         = "${var.aws_region}"
      encrypt        = true
      dynamodb_table = "${aws_dynamodb_table.terraform_locks.name}"
    }
  EOT
}
