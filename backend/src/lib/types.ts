// DynamoDB item types
export interface QuizItem {
  PK: string;
  SK: string;
  Type: 'Quiz';
  quizId: string;
  title: string;
  description: string;
  category: string;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionItem {
  PK: string;
  SK: string;
  Type: 'Question';
  quizId: string;
  questionId: string;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  lawReference: string;
}

// Question Bank types (extracted from PDFs)
export type QuestionStatus = 'pending_review' | 'approved' | 'rejected';

export type QuestionSource = 'pdf_extraction' | 'manual_entry' | 'seed_script';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type JobSource = 'pdf_extraction' | 'manual_entry';

export type Law =
  | 'Law 1'
  | 'Law 2'
  | 'Law 3'
  | 'Law 4'
  | 'Law 5'
  | 'Law 6'
  | 'Law 7'
  | 'Law 8'
  | 'Law 9'
  | 'Law 10'
  | 'Law 11'
  | 'Law 12'
  | 'Law 13'
  | 'Law 14'
  | 'Law 15'
  | 'Law 16'
  | 'Law 17';

export interface BankQuestionItem {
  PK: string; // QUESTION#{questionId}
  SK: string; // METADATA
  Type: 'BankQuestion';
  questionId: string;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  law: Law;
  lawReference: string; // e.g., "Law 1.1"
  confidence: number; // 0-1 from Claude extraction
  status: QuestionStatus;
  sourceFile: string; // S3 key of source PDF
  jobId: string; // Reference to extraction job
  hash: string; // Content hash for deduplication
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  // New fields for manual entry and analytics
  source?: QuestionSource; // 'pdf_extraction' | 'manual_entry' | 'seed_script'
  difficulty?: Difficulty; // 'easy' | 'medium' | 'hard'
  tags?: string[]; // Custom tags for categorization
  usageCount?: number; // How many times served in quizzes (default: 0)
  lastUsedAt?: string; // ISO timestamp of last usage
}

export type ExtractionJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ExtractionJobItem {
  PK: string; // JOB#{jobId}
  SK: string; // METADATA
  Type: 'ExtractionJob';
  jobId: string;
  s3Key: string;
  fileName: string;
  status: ExtractionJobStatus;
  totalQuestions: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  duplicateCount: number;
  published?: boolean;
  isPublic?: boolean; // true = unauthenticated users can take this quiz
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  // New fields for manual entry
  source?: JobSource; // 'pdf_extraction' | 'manual_entry'
  description?: string; // Quiz description (for manual jobs)
  category?: string; // Quiz category (default: 'Laws of the Game')
  // Quiz configuration (issue #14)
  timeLimitMinutes?: number;
  lawFilter?: Law;
  questionsPerAttempt?: number;
  shuffleOptions?: boolean;
}

// API response types
export interface QuizSummary {
  quizId: string;
  title: string;
  description: string;
  category: string;
  questionCount: number;
  isPublic?: boolean;
  timeLimitMinutes?: number;
  lawFilter?: Law;
  questionsPerAttempt?: number;
  shuffleOptions?: boolean;
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

export interface QuestionWithAnswer extends Question {
  correctAnswer: number;
  explanation: string;
  lawReference: string;
}

// Bank Question API responses
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
  source?: QuestionSource;
  difficulty?: Difficulty;
  tags?: string[];
  usageCount?: number;
  lastUsedAt?: string;
}

export interface ExtractionJob {
  jobId: string;
  fileName: string;
  status: ExtractionJobStatus;
  totalQuestions: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  duplicateCount: number;
  published?: boolean;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
  source?: JobSource;
  description?: string;
  category?: string;
  timeLimitMinutes?: number;
  lawFilter?: Law;
  questionsPerAttempt?: number;
}

// Claude extraction types
export interface ExtractedQuestion {
  text: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  law: Law;
  lawReference: string;
  confidence: number;
}

// ============================================================================
// User Progress Tracking (Issue #47)
// ============================================================================

export interface PerQuestionResult {
  questionId: string;
  selectedOption: number;
  isCorrect: boolean;
  law: Law;
}

export interface UserAttemptItem {
  PK: string; // USER#{userId}
  SK: string; // ATTEMPT#{createdAt}#{quizId}
  Type: 'UserAttempt';
  userId: string;
  quizId: string;
  score: number;
  total: number;
  percentage: number;
  questionResults: PerQuestionResult[];
  createdAt: string;
}

export interface LawStats {
  attempts: number;
  totalCorrect: number;
  avgScore: number;
  lastAttempt: string;
}

export interface UserStatsItem {
  PK: string; // USER#{userId}
  SK: string; // STATS
  Type: 'UserStats';
  userId: string;
  totalAttempts: number;
  averageScore: number;
  bestScore: number;
  byLaw: Partial<Record<Law, LawStats>>;
  currentStreak: number;
  longestStreak: number;
  lastStudyDate?: string; // YYYY-MM-DD UTC
  createdAt: string;
  updatedAt: string;
}

// API response types for user progress
export interface UserAttempt {
  attemptId: string;
  quizId: string;
  score: number;
  total: number;
  percentage: number;
  questionResults: PerQuestionResult[];
  createdAt: string;
}

export interface UserStats {
  totalAttempts: number;
  averageScore: number;
  bestScore: number;
  byLaw: Partial<Record<Law, LawStats>>;
  currentStreak: number;
  longestStreak: number;
  lastStudyDate?: string;
}

// ============================================================================
// Bookmarks
// ============================================================================

export interface BookmarkItem {
  PK: string; // USER#{userId}
  SK: string; // BOOKMARK#{questionId}
  Type: 'Bookmark';
  userId: string;
  questionId: string;
  createdAt: string;
}

// Lambda event types
export interface APIGatewayProxyEvent {
  httpMethod: string;
  path: string;
  pathParameters: { [key: string]: string } | null;
  queryStringParameters: { [key: string]: string } | null;
  headers: { [key: string]: string };
  body: string | null;
}

export interface APIGatewayProxyResult {
  statusCode: number;
  headers: { [key: string]: string };
  body: string;
}

export interface S3Event {
  Records: Array<{
    eventVersion: string;
    eventSource: string;
    awsRegion: string;
    eventTime: string;
    eventName: string;
    s3: {
      bucket: {
        name: string;
      };
      object: {
        key: string;
        size: number;
      };
    };
  }>;
}
