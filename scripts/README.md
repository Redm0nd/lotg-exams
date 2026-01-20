# Database Scripts

This directory contains scripts for managing the DynamoDB database.

## Seed Database

Populates the DynamoDB table with quiz data from JSON files.

**Note:** This script is for manually created quizzes from JSON files. For questions extracted from PDFs via the admin interface, use the PDF upload feature at `/admin/upload` instead - those questions are automatically stored in DynamoDB by the `processPdf` Lambda.

### Prerequisites

```bash
cd scripts
npm install
```

### Usage

```bash
# Use default sample data
npm run seed

# Use custom data file
node seed-database.js ../data/my-quizzes.json

# Set custom table name
TABLE_NAME=my-table-name npm run seed

# Set custom AWS region
AWS_REGION=us-west-2 npm run seed
```

### Environment Variables

- `TABLE_NAME` - DynamoDB table name (default: `lotg-exams-prod-quizzes`)
- `AWS_REGION` - AWS region (default: `us-east-1`)

### Data Format

The input JSON file should follow this structure:

```json
{
  "quizzes": [
    {
      "quizId": "001",
      "title": "Quiz Title",
      "description": "Quiz description",
      "category": "Category",
      "questionCount": 10,
      "questions": [
        {
          "questionId": "001",
          "text": "Question text?",
          "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
          "correctAnswer": 0,
          "explanation": "Explanation of the correct answer",
          "lawReference": "Law X.Y"
        }
      ]
    }
  ]
}
```

## AWS Credentials

Ensure you have AWS credentials configured:

```bash
# Via environment variables
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret

# Or via AWS CLI profile
aws configure
```
