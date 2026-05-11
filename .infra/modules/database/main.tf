resource "aws_dynamodb_table" "this" {
  name         = "${var.project_name}-${var.environment}-quizzes"
  billing_mode = "PAY_PER_REQUEST" # On-demand pricing, no capacity planning needed

  key_schema {
    attribute_name = "PK"
    key_type       = "HASH"
  }

  key_schema {
    attribute_name = "SK"
    key_type       = "RANGE"
  }

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

  attribute {
    name = "jobId"
    type = "S"
  }

  # Global Secondary Index for querying all quizzes
  global_secondary_index {
    name            = "Type-createdAt-index"
    projection_type = "ALL"

    key_schema {
      attribute_name = "Type"
      key_type       = "HASH"
    }

    key_schema {
      attribute_name = "createdAt"
      key_type       = "RANGE"
    }
  }

  # GSI for filtering questions by law and status
  global_secondary_index {
    name            = "Law-Status-index"
    projection_type = "ALL"

    key_schema {
      attribute_name = "law"
      key_type       = "HASH"
    }

    key_schema {
      attribute_name = "status"
      key_type       = "RANGE"
    }
  }

  # GSI for review queue (pending questions sorted by creation date)
  global_secondary_index {
    name            = "Status-CreatedAt-index"
    projection_type = "ALL"

    key_schema {
      attribute_name = "status"
      key_type       = "HASH"
    }

    key_schema {
      attribute_name = "createdAt"
      key_type       = "RANGE"
    }
  }

  # GSI for question deduplication by content hash
  global_secondary_index {
    name            = "Hash-index"
    projection_type = "KEYS_ONLY"

    key_schema {
      attribute_name = "hash"
      key_type       = "HASH"
    }
  }

  # GSI for querying questions by jobId and status (for quiz questions)
  global_secondary_index {
    name            = "JobId-Status-index"
    projection_type = "ALL"

    key_schema {
      attribute_name = "jobId"
      key_type       = "HASH"
    }

    key_schema {
      attribute_name = "status"
      key_type       = "RANGE"
    }
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
