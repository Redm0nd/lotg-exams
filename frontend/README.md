# LOTG Exams - Frontend

React + TypeScript + Vite frontend for the LOTG Exams quiz application.

## Features

- Quiz listing page with all available quizzes
- Interactive quiz-taking experience
- Real-time progress tracking
- Results page with explanations and law references
- Responsive design with Tailwind CSS
- TypeScript for type safety

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
├── pages/           # Page components
│   ├── QuizList.tsx
│   ├── QuizTake.tsx
│   └── QuizResults.tsx
├── api/            # API client
│   └── client.ts
├── types/          # TypeScript types
│   └── index.ts
├── styles/         # Global styles
│   └── index.css
├── App.tsx         # Main app component
└── main.tsx        # Entry point
```

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
