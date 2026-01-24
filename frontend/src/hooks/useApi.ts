import { useAuth0 } from '@auth0/auth0-react';
import { useCallback } from 'react';
import type {
  QuestionBankResponse,
  JobsResponse,
  JobDetailResponse,
  ReviewResponse,
  BulkReviewResponse,
  PublishResponse,
  QuestionStatus,
  Law,
  CreateManualJobRequest,
  CreateManualJobResponse,
  AddManualQuestionRequest,
  AddManualQuestionResponse,
  PresignedUrlResponse,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Hook that provides authenticated API functions.
 * Use this for admin endpoints that require authentication.
 */
export function useApi() {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();

  const fetchWithAuth = useCallback(
    async <T>(endpoint: string, options?: RequestInit): Promise<T> => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((options?.headers as Record<string, string>) || {}),
      };

      // Add auth header if authenticated
      if (isAuthenticated) {
        try {
          const token = await getAccessTokenSilently();
          headers['Authorization'] = `Bearer ${token}`;
        } catch {
          // Token fetch failed, continue without auth
          console.warn('Failed to get access token');
        }
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return response.json();
    },
    [getAccessTokenSilently, isAuthenticated]
  );

  // Admin endpoints with authentication
  const getPresignedUrl = useCallback(
    (fileName: string): Promise<PresignedUrlResponse> => {
      return fetchWithAuth<PresignedUrlResponse>('/admin/upload/presigned-url', {
        method: 'POST',
        body: JSON.stringify({
          fileName,
          contentType: 'application/pdf',
        }),
      });
    },
    [fetchWithAuth]
  );

  const getQuestionBank = useCallback(
    (params?: {
      law?: Law;
      status?: QuestionStatus;
      limit?: number;
    }): Promise<QuestionBankResponse> => {
      const searchParams = new URLSearchParams();
      if (params?.law) searchParams.set('law', params.law);
      if (params?.status) searchParams.set('status', params.status);
      if (params?.limit) searchParams.set('limit', params.limit.toString());

      const query = searchParams.toString();
      return fetchWithAuth<QuestionBankResponse>(`/admin/questions${query ? `?${query}` : ''}`);
    },
    [fetchWithAuth]
  );

  const getExtractionJobs = useCallback((): Promise<JobsResponse> => {
    return fetchWithAuth<JobsResponse>('/admin/jobs');
  }, [fetchWithAuth]);

  const getExtractionJob = useCallback(
    (jobId: string): Promise<JobDetailResponse> => {
      return fetchWithAuth<JobDetailResponse>(`/admin/jobs/${jobId}`);
    },
    [fetchWithAuth]
  );

  const reviewQuestion = useCallback(
    (questionId: string, status: QuestionStatus, reviewedBy?: string): Promise<ReviewResponse> => {
      return fetchWithAuth<ReviewResponse>(`/admin/questions/${questionId}/review`, {
        method: 'PUT',
        body: JSON.stringify({ status, reviewedBy }),
      });
    },
    [fetchWithAuth]
  );

  const bulkReviewQuestions = useCallback(
    (
      questionIds: string[],
      status: QuestionStatus,
      reviewedBy?: string
    ): Promise<BulkReviewResponse> => {
      return fetchWithAuth<BulkReviewResponse>('/admin/questions/bulk-review', {
        method: 'POST',
        body: JSON.stringify({ questionIds, status, reviewedBy }),
      });
    },
    [fetchWithAuth]
  );

  const publishQuiz = useCallback(
    (jobId: string, publish = true): Promise<PublishResponse> => {
      return fetchWithAuth<PublishResponse>(`/admin/jobs/${jobId}/publish`, {
        method: 'PUT',
        body: JSON.stringify({ publish }),
      });
    },
    [fetchWithAuth]
  );

  const createManualJob = useCallback(
    (request: CreateManualJobRequest): Promise<CreateManualJobResponse> => {
      return fetchWithAuth<CreateManualJobResponse>('/admin/jobs/manual', {
        method: 'POST',
        body: JSON.stringify(request),
      });
    },
    [fetchWithAuth]
  );

  const addManualQuestion = useCallback(
    (jobId: string, request: AddManualQuestionRequest): Promise<AddManualQuestionResponse> => {
      return fetchWithAuth<AddManualQuestionResponse>(`/admin/jobs/${jobId}/questions`, {
        method: 'POST',
        body: JSON.stringify(request),
      });
    },
    [fetchWithAuth]
  );

  return {
    getPresignedUrl,
    getQuestionBank,
    getExtractionJobs,
    getExtractionJob,
    reviewQuestion,
    bulkReviewQuestions,
    publishQuiz,
    createManualJob,
    addManualQuestion,
  };
}
