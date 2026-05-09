import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildApiGatewayEvent } from '../lib/test-utils.js';
import type { BankQuestionItem, ExtractionJobItem } from '../lib/types.js';

const { getExtractionJob, getBankQuestion, saveUserAttempt, updateUserStats, verifyToken } =
  vi.hoisted(() => ({
    getExtractionJob: vi.fn(),
    getBankQuestion: vi.fn(),
    saveUserAttempt: vi.fn().mockResolvedValue(undefined),
    updateUserStats: vi.fn().mockResolvedValue(undefined),
    verifyToken: vi.fn(),
  }));

vi.mock('../lib/dynamodb.js', () => ({
  getExtractionJob,
  getBankQuestion,
  saveUserAttempt,
  updateUserStats,
}));

vi.mock('../lib/verifyToken.js', () => ({
  verifyToken,
}));

import { handler } from './submitAnswers.js';

function publishedJob(overrides: Partial<ExtractionJobItem> = {}): ExtractionJobItem {
  return {
    PK: 'JOB#quiz-1',
    SK: 'METADATA',
    Type: 'ExtractionJob',
    jobId: 'quiz-1',
    s3Key: '',
    fileName: 'A Quiz',
    status: 'completed',
    totalQuestions: 0,
    approvedCount: 0,
    pendingCount: 0,
    rejectedCount: 0,
    duplicateCount: 0,
    published: true,
    isPublic: true,
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
    ...overrides,
  };
}

function bankQuestion(overrides: Partial<BankQuestionItem> = {}): BankQuestionItem {
  return {
    PK: `QUESTION#${overrides.questionId ?? 'q1'}`,
    SK: 'METADATA',
    Type: 'BankQuestion',
    questionId: 'q1',
    text: 'What is the diameter of the centre circle?',
    options: ['9.15m', '7m', '11m', '5m'],
    correctAnswer: 0,
    explanation: 'Law 1.',
    law: 'Law 1',
    lawReference: 'Law 1.4',
    confidence: 0.95,
    status: 'approved',
    sourceFile: 'lotg.pdf',
    jobId: 'quiz-1',
    hash: 'abc',
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
    ...overrides,
  };
}

function event(quizId: string, body: unknown): ReturnType<typeof buildApiGatewayEvent> {
  return buildApiGatewayEvent({
    httpMethod: 'POST',
    path: `/quizzes/${quizId}/submit`,
    pathParameters: { id: quizId },
    body: body === undefined ? null : JSON.stringify(body),
  });
}

describe('submitAnswers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('input validation', () => {
    it('returns 400 when path parameter is missing', async () => {
      const res = await handler(buildApiGatewayEvent({ httpMethod: 'POST', body: '{}' }));
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toMatch(/quiz id/i);
    });

    it('returns 400 when body is missing', async () => {
      const res = await handler(
        buildApiGatewayEvent({ httpMethod: 'POST', pathParameters: { id: 'quiz-1' } })
      );
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 when body is not valid JSON', async () => {
      const res = await handler(
        buildApiGatewayEvent({
          httpMethod: 'POST',
          pathParameters: { id: 'quiz-1' },
          body: 'not json',
        })
      );
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 when answers is not an array', async () => {
      const res = await handler(event('quiz-1', { answers: 'oops' }));
      expect(res.statusCode).toBe(400);
    });
  });

  describe('quiz lookup', () => {
    it('returns 404 when the quiz does not exist', async () => {
      getExtractionJob.mockResolvedValue(null);
      const res = await handler(event('missing', { answers: [] }));
      expect(res.statusCode).toBe(404);
    });

    it('returns 404 when the quiz is not published', async () => {
      getExtractionJob.mockResolvedValue(publishedJob({ published: false }));
      const res = await handler(event('quiz-1', { answers: [] }));
      expect(res.statusCode).toBe(404);
    });
  });

  describe('auth gate for non-public quizzes', () => {
    it('returns 401 when no auth token is provided', async () => {
      getExtractionJob.mockResolvedValue(publishedJob({ isPublic: false }));
      verifyToken.mockResolvedValue(null);
      const res = await handler(event('quiz-1', { answers: [] }));
      expect(res.statusCode).toBe(401);
    });

    it('proceeds when a valid auth token is provided', async () => {
      getExtractionJob.mockResolvedValue(publishedJob({ isPublic: false }));
      verifyToken.mockResolvedValue('auth0|123');
      const res = await handler(event('quiz-1', { answers: [] }));
      expect(res.statusCode).toBe(200);
    });
  });

  describe('scoring', () => {
    it('scores 100% when every answer is correct', async () => {
      getExtractionJob.mockResolvedValue(publishedJob());
      getBankQuestion.mockImplementation(async (id: string) =>
        bankQuestion({ questionId: id, correctAnswer: 0 })
      );

      const res = await handler(
        event('quiz-1', {
          answers: [
            { questionId: 'q1', selectedOption: 0 },
            { questionId: 'q2', selectedOption: 0 },
          ],
        })
      );

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.score).toEqual({ correct: 2, total: 2, percentage: 100 });
    });

    it('scores 50% when half the answers are correct', async () => {
      getExtractionJob.mockResolvedValue(publishedJob());
      getBankQuestion.mockImplementation(async (id: string) =>
        bankQuestion({ questionId: id, correctAnswer: id === 'q1' ? 0 : 1 })
      );

      const res = await handler(
        event('quiz-1', {
          answers: [
            { questionId: 'q1', selectedOption: 0 }, // correct
            { questionId: 'q2', selectedOption: 0 }, // wrong
          ],
        })
      );

      const body = JSON.parse(res.body);
      expect(body.score).toEqual({ correct: 1, total: 2, percentage: 50 });
    });

    it('treats unanswered questions (selectedOption: -1) as wrong without throwing', async () => {
      getExtractionJob.mockResolvedValue(publishedJob());
      getBankQuestion.mockResolvedValue(bankQuestion({ correctAnswer: 0 }));

      const res = await handler(
        event('quiz-1', {
          answers: [{ questionId: 'q1', selectedOption: -1 }],
        })
      );

      const body = JSON.parse(res.body);
      expect(body.score).toEqual({ correct: 0, total: 1, percentage: 0 });
      expect(body.results[0].isCorrect).toBe(false);
      expect(body.results[0].selectedOption).toBe(-1);
    });

    it('skips answers whose questionId belongs to a different quiz', async () => {
      getExtractionJob.mockResolvedValue(publishedJob());
      getBankQuestion.mockImplementation(async (id: string) =>
        bankQuestion({ questionId: id, jobId: id === 'q-other' ? 'quiz-2' : 'quiz-1' })
      );

      const res = await handler(
        event('quiz-1', {
          answers: [
            { questionId: 'q1', selectedOption: 0 },
            { questionId: 'q-other', selectedOption: 0 },
          ],
        })
      );

      const body = JSON.parse(res.body);
      expect(body.results).toHaveLength(1);
      expect(body.results[0].questionId).toBe('q1');
    });

    it('skips answers whose questionId is not in the bank', async () => {
      getExtractionJob.mockResolvedValue(publishedJob());
      getBankQuestion.mockResolvedValue(null);

      const res = await handler(
        event('quiz-1', {
          answers: [{ questionId: 'unknown', selectedOption: 0 }],
        })
      );

      const body = JSON.parse(res.body);
      expect(body.results).toHaveLength(0);
      expect(body.score).toEqual({ correct: 0, total: 0, percentage: 0 });
    });

    it('returns 500 when DynamoDB throws', async () => {
      getExtractionJob.mockRejectedValue(new Error('boom'));
      const res = await handler(event('quiz-1', { answers: [] }));
      expect(res.statusCode).toBe(500);
    });
  });
});
