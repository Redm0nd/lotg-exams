import type {
  QuizSummary,
  QuizDetail,
  Question,
  PresignedUrlResponse,
  QuestionBankResponse,
  JobsResponse,
  JobDetailResponse,
  ReviewResponse,
  BulkReviewResponse,
  PublishResponse,
  QuestionStatus,
  Law,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Quiz endpoints
export async function getQuizzes(): Promise<QuizSummary[]> {
  return fetchAPI<QuizSummary[]>('/quizzes');
}

export async function getQuiz(quizId: string): Promise<QuizDetail> {
  return fetchAPI<QuizDetail>(`/quizzes/${quizId}`);
}

export async function getQuestions(quizId: string, limit = 10): Promise<Question[]> {
  return fetchAPI<Question[]>(`/quizzes/${quizId}/questions?limit=${limit}`);
}

// Admin endpoints
export async function getPresignedUrl(fileName: string): Promise<PresignedUrlResponse> {
  return fetchAPI<PresignedUrlResponse>('/admin/upload/presigned-url', {
    method: 'POST',
    body: JSON.stringify({
      fileName,
      contentType: 'application/pdf',
    }),
  });
}

export async function uploadPdfToS3(
  uploadUrl: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'));
    });

    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', 'application/pdf');
    xhr.send(file);
  });
}

export async function getQuestionBank(params?: {
  law?: Law;
  status?: QuestionStatus;
  limit?: number;
}): Promise<QuestionBankResponse> {
  const searchParams = new URLSearchParams();
  if (params?.law) searchParams.set('law', params.law);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.limit) searchParams.set('limit', params.limit.toString());

  const query = searchParams.toString();
  return fetchAPI<QuestionBankResponse>(`/admin/questions${query ? `?${query}` : ''}`);
}

export async function getExtractionJobs(): Promise<JobsResponse> {
  return fetchAPI<JobsResponse>('/admin/jobs');
}

export async function getExtractionJob(jobId: string): Promise<JobDetailResponse> {
  return fetchAPI<JobDetailResponse>(`/admin/jobs/${jobId}`);
}

export async function reviewQuestion(
  questionId: string,
  status: QuestionStatus,
  reviewedBy?: string
): Promise<ReviewResponse> {
  return fetchAPI<ReviewResponse>(`/admin/questions/${questionId}/review`, {
    method: 'PUT',
    body: JSON.stringify({ status, reviewedBy }),
  });
}

export async function bulkReviewQuestions(
  questionIds: string[],
  status: QuestionStatus,
  reviewedBy?: string
): Promise<BulkReviewResponse> {
  return fetchAPI<BulkReviewResponse>('/admin/questions/bulk-review', {
    method: 'POST',
    body: JSON.stringify({ questionIds, status, reviewedBy }),
  });
}

export async function publishQuiz(
  jobId: string,
  publish = true
): Promise<PublishResponse> {
  return fetchAPI<PublishResponse>(`/admin/jobs/${jobId}/publish`, {
    method: 'PUT',
    body: JSON.stringify({ publish }),
  });
}
