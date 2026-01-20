# LOTG Exams - Backend

Lambda functions for the LOTG Exams quiz application.

## Structure

```
backend/
├── src/
│   ├── handlers/         # Lambda function handlers
│   │   ├── getQuizzes.ts
│   │   ├── getQuiz.ts
│   │   ├── getQuestions.ts
│   │   ├── generatePresignedUrl.ts
│   │   ├── processPdf.ts
│   │   ├── getExtractionJobs.ts
│   │   ├── getQuestionBank.ts
│   │   ├── reviewQuestion.ts
│   │   ├── bulkReviewQuestions.ts
│   │   └── publishQuiz.ts
│   └── lib/              # Shared utilities
│       ├── types.ts
│       ├── dynamodb.ts
│       └── response.ts
├── dist/                 # Build output (gitignored)
└── build.js              # Build script
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

Lambda functions use these environment variables (set by Terraform):

| Variable | Description | Used By |
|----------|-------------|---------|
| `TABLE_NAME` | DynamoDB table name | All functions |
| `BUCKET_NAME` | S3 bucket for PDF uploads | generatePresignedUrl, processPdf |
| `SECRET_NAME` | Secrets Manager secret for Claude API key | processPdf |
| `NODE_ENV` | Environment (dev/prod) | All functions |

## API Endpoints

### Public Endpoints

#### GET /quizzes

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

#### GET /quizzes/{id}

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

#### GET /quizzes/{id}/questions?limit=10

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

### Admin Endpoints

These endpoints power the admin interface for PDF upload and question management.

#### POST /admin/upload/presigned-url

Generate S3 presigned URL for PDF upload.

**Request:**
```json
{
  "filename": "exam-questions.pdf",
  "contentType": "application/pdf"
}
```

**Response:**
```json
{
  "uploadUrl": "https://s3.amazonaws.com/...",
  "key": "uploads/01HQXYZ.../exam-questions.pdf",
  "jobId": "01HQXYZ..."
}
```

#### GET /admin/jobs

List all extraction jobs.

**Query Parameters:**
- `status` (optional) - Filter by status: `pending`, `processing`, `completed`, `failed`
- `limit` (optional) - Max results (default: 50)

**Response:**
```json
[
  {
    "jobId": "01HQXYZ...",
    "filename": "exam-questions.pdf",
    "status": "completed",
    "questionCount": 25,
    "createdAt": "2026-01-19T10:00:00Z",
    "completedAt": "2026-01-19T10:02:00Z"
  }
]
```

#### GET /admin/jobs/{id}

Get job detail with extracted questions.

**Response:**
```json
{
  "jobId": "01HQXYZ...",
  "filename": "exam-questions.pdf",
  "status": "completed",
  "questionCount": 25,
  "questions": [
    {
      "questionId": "01HQABC...",
      "text": "What is the minimum length of the field?",
      "options": ["90m", "100m", "110m", "120m"],
      "correctAnswer": 1,
      "law": "1",
      "confidence": 0.95,
      "status": "approved"
    }
  ],
  "publishedQuizId": null
}
```

#### PUT /admin/jobs/{id}/publish

Publish or unpublish an extraction job as a quiz.

**Request (publish):**
```json
{
  "action": "publish",
  "title": "Law 1: The Field of Play",
  "description": "Test your knowledge of field dimensions"
}
```

**Request (unpublish):**
```json
{
  "action": "unpublish"
}
```

**Response:**
```json
{
  "quizId": "QUIZ#01HQDEF...",
  "title": "Law 1: The Field of Play",
  "questionCount": 25
}
```

#### GET /admin/questions

Query question bank with filters.

**Query Parameters:**
- `status` (optional) - Filter by: `pending`, `approved`, `rejected`
- `law` (optional) - Filter by law number (1-17)
- `limit` (optional) - Max results (default: 50)
- `cursor` (optional) - Pagination cursor

**Response:**
```json
{
  "questions": [
    {
      "questionId": "01HQABC...",
      "text": "What is the minimum length of the field?",
      "law": "1",
      "confidence": 0.95,
      "status": "pending",
      "jobId": "01HQXYZ..."
    }
  ],
  "nextCursor": "eyJQSy..."
}
```

#### PUT /admin/questions/{id}/review

Approve or reject a single question.

**Request:**
```json
{
  "status": "approved"
}
```
or
```json
{
  "status": "rejected",
  "reason": "Duplicate of existing question"
}
```

**Response:**
```json
{
  "questionId": "01HQABC...",
  "status": "approved"
}
```

#### POST /admin/questions/bulk-review

Bulk approve or reject questions (max 100 per request).

**Request:**
```json
{
  "questionIds": ["01HQABC...", "01HQDEF...", "01HQGHI..."],
  "status": "approved"
}
```

**Response:**
```json
{
  "updated": 3,
  "failed": 0
}
```

## Claude AI Integration

The `processPdf` Lambda uses Claude's vision capabilities to extract questions from PDF documents.

### How It Works

1. PDF is uploaded to S3 via presigned URL
2. S3 event triggers `processPdf` Lambda
3. Lambda converts PDF pages to images
4. Each page is sent to Claude Vision API for extraction
5. Claude identifies questions, options, correct answers, and law references
6. Questions are saved to DynamoDB with confidence scores

### Confidence Scoring

Each extracted question receives a confidence score (0-1) based on:
- Clarity of question text extraction
- Completeness of options
- Presence of correct answer
- Law reference identification

**Auto-approval threshold:** Questions with confidence ≥ 0.95 are automatically approved.

### Law Classification

Claude identifies which of the 17 Laws of the Game each question relates to:
- Law 1: The Field of Play
- Law 2: The Ball
- Law 3: The Players
- ...through Law 17: The Corner Kick

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

aws lambda update-function-code \
  --function-name lotg-exams-prod-generatePresignedUrl \
  --zip-file fileb://dist/generatePresignedUrl.zip

aws lambda update-function-code \
  --function-name lotg-exams-prod-processPdf \
  --zip-file fileb://dist/processPdf.zip

aws lambda update-function-code \
  --function-name lotg-exams-prod-getExtractionJobs \
  --zip-file fileb://dist/getExtractionJobs.zip

aws lambda update-function-code \
  --function-name lotg-exams-prod-getQuestionBank \
  --zip-file fileb://dist/getQuestionBank.zip

aws lambda update-function-code \
  --function-name lotg-exams-prod-reviewQuestion \
  --zip-file fileb://dist/reviewQuestion.zip

aws lambda update-function-code \
  --function-name lotg-exams-prod-bulkReviewQuestions \
  --zip-file fileb://dist/bulkReviewQuestions.zip

aws lambda update-function-code \
  --function-name lotg-exams-prod-publishQuiz \
  --zip-file fileb://dist/publishQuiz.zip
```
