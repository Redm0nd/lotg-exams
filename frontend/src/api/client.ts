import type { QuizSummary, QuizDetail, Question } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function fetchAPI<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function getQuizzes(): Promise<QuizSummary[]> {
  return fetchAPI<QuizSummary[]>('/quizzes');
}

export async function getQuiz(quizId: string): Promise<QuizDetail> {
  return fetchAPI<QuizDetail>(`/quizzes/${quizId}`);
}

export async function getQuestions(quizId: string, limit = 10): Promise<Question[]> {
  return fetchAPI<Question[]>(`/quizzes/${quizId}/questions?limit=${limit}`);
}
