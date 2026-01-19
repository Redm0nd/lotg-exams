# LOTG Exams - Backend

Lambda functions for the LOTG Exams quiz application.

## Structure

```
backend/
├── src/
│   ├── handlers/       # Lambda function handlers
│   │   ├── getQuizzes.ts
│   │   ├── getQuiz.ts
│   │   └── getQuestions.ts
│   └── lib/           # Shared utilities
│       ├── types.ts
│       ├── dynamodb.ts
│       └── response.ts
├── dist/              # Build output (gitignored)
└── build.js           # Build script
```

## Development

### Install dependencies

```bash
npm install
```

### Build Lambda functions

```bash
npm run build
```

This will:
1. Bundle each handler with esbuild
2. Create optimized JavaScript files
3. Generate `.zip` files for Lambda deployment in `dist/`

### Environment Variables

Lambda functions use these environment variables:

- `TABLE_NAME` - DynamoDB table name (set by Terraform)
- `NODE_ENV` - Environment (dev/prod)

## API Endpoints

### GET /quizzes

Returns list of all available quizzes.

**Response:**
```json
[
  {
    "quizId": "001",
    "title": "Law 1: The Field of Play",
    "description": "Test your knowledge...",
    "category": "Laws of the Game",
    "questionCount": 10
  }
]
```

### GET /quizzes/{id}

Returns quiz metadata.

**Response:**
```json
{
  "quizId": "001",
  "title": "Law 1: The Field of Play",
  "description": "Test your knowledge...",
  "category": "Laws of the Game",
  "questionCount": 10,
  "createdAt": "2026-01-19T00:00:00Z",
  "updatedAt": "2026-01-19T00:00:00Z"
}
```

### GET /quizzes/{id}/questions?limit=10

Returns randomized questions for a quiz (without correct answers).

**Query Parameters:**
- `limit` (optional) - Number of questions to return (1-50, default: 10)

**Response:**
```json
[
  {
    "questionId": "003",
    "text": "What is the radius of the center circle?",
    "options": [
      "9.15m (10 yards)",
      "10m",
      "11m",
      "12m"
    ]
  }
]
```

## Deployment

Lambda functions are deployed automatically via GitHub Actions when merged to main.

Manual deployment:
```bash
# Build first
npm run build

# Update Lambda functions via AWS CLI
aws lambda update-function-code \
  --function-name lotg-exams-prod-getQuizzes \
  --zip-file fileb://dist/getQuizzes.zip

aws lambda update-function-code \
  --function-name lotg-exams-prod-getQuiz \
  --zip-file fileb://dist/getQuiz.zip

aws lambda update-function-code \
  --function-name lotg-exams-prod-getQuestions \
  --zip-file fileb://dist/getQuestions.zip
```
