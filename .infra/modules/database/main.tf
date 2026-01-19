resource "aws_dynamodb_table" "this" {
  name         = "${var.project_name}-${var.environment}-quizzes"
  billing_mode = "PAY_PER_REQUEST" # On-demand pricing, no capacity planning needed
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "Type"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }

  # Global Secondary Index for querying all quizzes
  global_secondary_index {
    name            = "Type-createdAt-index"
    hash_key        = "Type"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  # Enable point-in-time recovery for data protection
  point_in_time_recovery {
    enabled = true
  }

  # Enable encryption at rest
  server_side_encryption {
    enabled = true
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-quizzes"
  }
}
