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

  # Attributes for question bank GSIs
  attribute {
    name = "law"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  attribute {
    name = "hash"
    type = "S"
  }

  # Global Secondary Index for querying all quizzes
  global_secondary_index {
    name            = "Type-createdAt-index"
    hash_key        = "Type"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  # GSI for filtering questions by law and status
  global_secondary_index {
    name            = "Law-Status-index"
    hash_key        = "law"
    range_key       = "status"
    projection_type = "ALL"
  }

  # GSI for review queue (pending questions sorted by creation date)
  global_secondary_index {
    name            = "Status-CreatedAt-index"
    hash_key        = "status"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  # GSI for question deduplication by content hash
  global_secondary_index {
    name            = "Hash-index"
    hash_key        = "hash"
    projection_type = "KEYS_ONLY"
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
