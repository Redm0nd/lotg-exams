export interface QuizSummary {
  quizId: string;
  title: string;
  description: string;
  category: string;
  questionCount: number;
}

export interface QuizDetail extends QuizSummary {
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  questionId: string;
  text: string;
  options: string[];
}

export interface Answer {
  questionId: string;
  selectedOption: number;
}

export interface QuizResult {
  question: Question;
  selectedOption: number;
  correctOption: number;
  isCorrect: boolean;
  explanation: string;
  lawReference: string;
}

// Admin types
export type QuestionStatus = 'pending_review' | 'approved' | 'rejected';

export type Law =
  | 'Law 1' | 'Law 2' | 'Law 3' | 'Law 4' | 'Law 5'
  | 'Law 6' | 'Law 7' | 'Law 8' | 'Law 9' | 'Law 10'
  | 'Law 11' | 'Law 12' | 'Law 13' | 'Law 14' | 'Law 15'
  | 'Law 16' | 'Law 17';

export interface BankQuestion {
  questionId: string;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  law: Law;
  lawReference: string;
  confidence: number;
  status: QuestionStatus;
  sourceFile: string;
  jobId: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
}

export type ExtractionJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ExtractionJob {
  jobId: string;
  fileName: string;
  status: ExtractionJobStatus;
  totalQuestions: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  duplicateCount: number;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  s3Key: string;
  jobId: string;
  expiresIn: number;
}

export interface QuestionBankResponse {
  questions: BankQuestion[];
  count: number;
  filters: {
    law: string | null;
    status: string | null;
    limit: number;
  };
}

export interface JobsResponse {
  jobs: ExtractionJob[];
  count: number;
}

export interface JobDetailResponse extends ExtractionJob {
  questions: BankQuestion[];
}

export interface ReviewResponse {
  questionId: string;
  status: QuestionStatus;
  previousStatus: QuestionStatus;
  message: string;
}

export interface BulkReviewResponse {
  results: Array<{
    questionId: string;
    success: boolean;
    previousStatus?: QuestionStatus;
    error?: string;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
    targetStatus: QuestionStatus;
  };
}
