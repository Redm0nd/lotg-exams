# LOTG Exams - Frontend

React + TypeScript + Vite frontend for the LOTG Exams quiz application.

## Features

- Quiz listing page with all available quizzes
- Interactive quiz-taking experience
- Real-time progress tracking
- Results page with explanations and law references
- Responsive design with Tailwind CSS
- TypeScript for type safety
- **Admin Interface** for question management

## Development

### Install dependencies

```bash
npm install
```

### Run development server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

### Build for production

```bash
npm run build
```

Output will be in the `dist/` directory.

### Preview production build

```bash
npm run preview
```

## Environment Variables

Create a `.env` file with:

```env
VITE_API_URL=https://your-api-gateway-url.amazonaws.com/prod
```

Get the API Gateway URL from Terraform outputs:

```bash
cd .infra
terraform output api_gateway_url
```

## Project Structure

```
src/
├── pages/              # Page components
│   ├── QuizList.tsx       # Public quiz listing
│   ├── QuizTake.tsx       # Quiz taking experience
│   ├── QuizResults.tsx    # Quiz results with explanations
│   └── admin/             # Admin interface pages
│       ├── Dashboard.tsx     # Admin home with stats
│       ├── Upload.tsx        # PDF upload interface
│       ├── Jobs.tsx          # Extraction job list
│       ├── JobDetail.tsx     # Job detail + publish button
│       ├── Review.tsx        # Question review queue
│       └── QuestionBank.tsx  # All questions browser
├── api/                # API client
│   └── client.ts
├── types/              # TypeScript types
│   └── index.ts
├── styles/             # Global styles
│   └── index.css
├── App.tsx             # Main app component
└── main.tsx            # Entry point
```

## Admin Interface

The admin interface allows you to manage questions and quizzes through PDF upload and AI extraction.

### Pages

#### Dashboard (`/admin`)
- Overview statistics (total questions, pending review, published quizzes)
- Quick links to common actions
- Recent activity feed

#### Upload (`/admin/upload`)
- Drag-and-drop PDF upload
- Real-time upload progress
- Automatic job creation and tracking

#### Jobs (`/admin/jobs`)
- List of all extraction jobs
- Filter by status (pending, processing, completed, failed)
- Click through to job details

#### Job Detail (`/admin/jobs/:id`)
- View extracted questions from a specific PDF
- See question confidence scores
- Publish/unpublish job as a quiz
- Set quiz title and description when publishing

#### Review (`/admin/review`)
- Queue of pending questions needing review
- Approve or reject individual questions
- Bulk approve/reject actions
- Filter by law number

#### Question Bank (`/admin/questions`)
- Browse all extracted questions
- Filter by status (pending, approved, rejected)
- Filter by law (1-17)
- View question details including confidence score

### Workflow

1. **Upload PDF** - Go to `/admin/upload` and drop a PDF with exam questions
2. **Wait for Processing** - The PDF is processed by Claude AI (check `/admin/jobs`)
3. **Review Questions** - Questions with confidence < 0.95 need manual review at `/admin/review`
4. **Publish Quiz** - Once satisfied, publish from the job detail page

## Deployment

The frontend is automatically deployed to S3 and served via CloudFront when merged to main.

Manual deployment:

```bash
# Build
npm run build

# Sync to S3 (replace with your bucket name)
aws s3 sync dist/ s3://lotg-exams-prod-frontend --delete

# Invalidate CloudFront cache (replace with your distribution ID)
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

## Technologies

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS
- **React Router** - Client-side routing
