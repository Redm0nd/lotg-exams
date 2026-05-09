import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildApiGatewayEvent } from '../lib/test-utils.js';
import type { BankQuestionItem, ExtractionJobItem } from '../lib/types.js';

const { getExtractionJob, getApprovedQuestionsByJobId, shuffleArray, updateQuestionUsage, verifyToken } =
  vi.hoisted(() => ({
    getExtractionJob: vi.fn(),
    getApprovedQuestionsByJobId: vi.fn(),
    shuffleArray: vi.fn(<T>(arr: T[]) => [...arr]),
    updateQuestionUsage: vi.fn().mockResolvedValue(undefined),
    verifyToken: vi.fn(),
  }));

vi.mock('../lib/dynamodb.js', () => ({
  getExtractionJob,
  getApprovedQuestionsByJobId,
  shuffleArray,
  updateQuestionUsage,
}));

vi.mock('../lib/verifyToken.js', () => ({
  verifyToken,
}));

import { handler } from './getQuestions.js';

function publishedJob(overrides: Partial<ExtractionJobItem> = {}): ExtractionJobItem {
  return {
    PK: 'JOB#quiz-1',
    SK: 'METADATA',
    Type: 'ExtractionJob',
    jobId: 'quiz-1',
    s3Key: '',
    fileName: 'quiz.pdf',
    status: 'completed',
    totalQuestions: 5,
    approvedCount: 5,
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

function bankQuestion(id: string, law = 'Law 1' as BankQuestionItem['law']): BankQuestionItem {
  return {
    PK: `QUESTION#${id}`,
    SK: 'METADATA',
    Type: 'BankQuestion',
    questionId: id,
    text: `Question ${id}`,
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 0,
    explanation: 'Explanation',
    law,
    lawReference: `${law}.1`,
    confidence: 0.9,
    status: 'approved',
    sourceFile: 'quiz.pdf',
    jobId: 'quiz-1',
    hash: `hash-${id}`,
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
  };
}

function event(quizId?: string, query: Record<string, string> = {}) {
  return buildApiGatewayEvent({
    httpMethod: 'GET',
    pathParameters: quizId ? { id: quizId } : null,
    queryStringParameters: Object.keys(query).length ? query : null,
  });
}

describe('getQuestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    shuffleArray.mockImplementation(<T>(arr: T[]) => [...arr]);
    updateQuestionUsage.mockResolvedValue(undefined);
  });

  describe('input validation', () => {
    it('returns 400 when quiz ID is missing', async () => {
      const res = await handler(buildApiGatewayEvent());
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 when limit is non-numeric', async () => {
      const res = await handler(event('quiz-1', { limit: 'abc' }));
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 when limit is 0', async () => {
      const res = await handler(event('quiz-1', { limit: '0' }));
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 when limit exceeds 50', async () => {
      const res = await handler(event('quiz-1', { limit: '51' }));
      expect(res.statusCode).toBe(400);
    });
  });

  describe('quiz lookup', () => {
    it('returns 404 when job does not exist', async () => {
      getExtractionJob.mockResolvedValue(null);
      const res = await handler(event('quiz-1'));
      expect(res.statusCode).toBe(404);
    });

    it('returns 404 when job is not published', async () => {
      getExtractionJob.mockResolvedValue(publishedJob({ published: false }));
      const res = await handler(event('quiz-1'));
      expect(res.statusCode).toBe(404);
    });

    it('returns 404 when no approved questions exist', async () => {
      getExtractionJob.mockResolvedValue(publishedJob({ approvedCount: 0 }));
      const res = await handler(event('quiz-1'));
      expect(res.statusCode).toBe(404);
    });
  });

  describe('auth gate', () => {
    it('returns 401 for study mode without auth', async () => {
      getExtractionJob.mockResolvedValue(publishedJob());
      verifyToken.mockResolvedValue(null);
      const res = await handler(event('quiz-1', { mode: 'study' }));
      expect(res.statusCode).toBe(401);
    });

    it('returns 401 for non-public quiz without auth', async () => {
      getExtractionJob.mockResolvedValue(publishedJob({ isPublic: false }));
      verifyToken.mockResolvedValue(null);
      getApprovedQuestionsByJobId.mockResolvedValue([bankQuestion('q1')]);
      const res = await handler(event('quiz-1'));
      expect(res.statusCode).toBe(401);
    });

    it('proceeds for non-public quiz with valid auth', async () => {
      getExtractionJob.mockResolvedValue(publishedJob({ isPublic: false }));
      verifyToken.mockResolvedValue('auth0|123');
      getApprovedQuestionsByJobId.mockResolvedValue([bankQuestion('q1')]);
      const res = await handler(event('quiz-1'));
      expect(res.statusCode).toBe(200);
    });
  });

  describe('question response', () => {
    it('returns questions without answers in standard mode', async () => {
      getExtractionJob.mockResolvedValue(publishedJob());
      getApprovedQuestionsByJobId.mockResolvedValue([bankQuestion('q1')]);
      const res = await handler(event('quiz-1'));
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body[0]).toHaveProperty('questionId', 'q1');
      expect(body[0]).toHaveProperty('text');
      expect(body[0]).toHaveProperty('options');
      expect(body[0]).not.toHaveProperty('correctAnswer');
      expect(body[0]).not.toHaveProperty('explanation');
    });

    it('returns questions with answers in study mode', async () => {
      getExtractionJob.mockResolvedValue(publishedJob());
      verifyToken.mockResolvedValue('auth0|123');
      getApprovedQuestionsByJobId.mockResolvedValue([bankQuestion('q1')]);
      const res = await handler(event('quiz-1', { mode: 'study' }));
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body[0]).toHaveProperty('correctAnswer');
      expect(body[0]).toHaveProperty('explanation');
    });

    it('applies limit param', async () => {
      getExtractionJob.mockResolvedValue(publishedJob());
      getApprovedQuestionsByJobId.mockResolvedValue([
        bankQuestion('q1'),
        bankQuestion('q2'),
        bankQuestion('q3'),
      ]);
      const res = await handler(event('quiz-1', { limit: '2' }));
      const body = JSON.parse(res.body);
      expect(body).toHaveLength(2);
    });

    it('filters questions by lawFilter when set on job', async () => {
      getExtractionJob.mockResolvedValue(publishedJob({ lawFilter: 'Law 1' }));
      getApprovedQuestionsByJobId.mockResolvedValue([
        bankQuestion('q1', 'Law 1'),
        bankQuestion('q2', 'Law 2'),
      ]);
      const res = await handler(event('quiz-1'));
      const body = JSON.parse(res.body);
      expect(body.every((q: { questionId: string }) => q.questionId === 'q1')).toBe(true);
    });

    it('returns 404 when law filter removes all questions', async () => {
      getExtractionJob.mockResolvedValue(publishedJob({ lawFilter: 'Law 5' }));
      getApprovedQuestionsByJobId.mockResolvedValue([bankQuestion('q1', 'Law 1')]);
      const res = await handler(event('quiz-1'));
      expect(res.statusCode).toBe(404);
    });
  });

  it('returns 500 when DynamoDB throws', async () => {
    getExtractionJob.mockRejectedValue(new Error('db error'));
    const res = await handler(event('quiz-1'));
    expect(res.statusCode).toBe(500);
  });
});
