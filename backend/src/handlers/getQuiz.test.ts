import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildApiGatewayEvent } from '../lib/test-utils.js';
import type { ExtractionJobItem } from '../lib/types.js';

const { getExtractionJob } = vi.hoisted(() => ({
  getExtractionJob: vi.fn(),
}));

vi.mock('../lib/dynamodb.js', () => ({
  getExtractionJob,
}));

import { handler } from './getQuiz.js';

function publishedJob(overrides: Partial<ExtractionJobItem> = {}): ExtractionJobItem {
  return {
    PK: 'JOB#quiz-1',
    SK: 'METADATA',
    Type: 'ExtractionJob',
    jobId: 'quiz-1',
    s3Key: 'uploads/law-quiz.pdf',
    fileName: 'law-quiz.pdf',
    status: 'completed',
    totalQuestions: 10,
    approvedCount: 8,
    pendingCount: 0,
    rejectedCount: 2,
    duplicateCount: 0,
    published: true,
    isPublic: true,
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-02T00:00:00.000Z',
    ...overrides,
  };
}

function event(quizId?: string) {
  return buildApiGatewayEvent({
    httpMethod: 'GET',
    path: `/quizzes/${quizId ?? 'quiz-1'}`,
    pathParameters: quizId ? { id: quizId } : null,
  });
}

describe('getQuiz', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('input validation', () => {
    it('returns 400 when quiz ID is missing from path', async () => {
      const res = await handler(buildApiGatewayEvent({ httpMethod: 'GET' }));
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toMatch(/quiz id/i);
    });
  });

  describe('quiz lookup', () => {
    it('returns 404 when the job does not exist', async () => {
      getExtractionJob.mockResolvedValue(null);
      const res = await handler(event('missing'));
      expect(res.statusCode).toBe(404);
    });

    it('returns 404 when the job is not published', async () => {
      getExtractionJob.mockResolvedValue(publishedJob({ published: false }));
      const res = await handler(event('quiz-1'));
      expect(res.statusCode).toBe(404);
    });

    it('returns 404 when there are no approved questions', async () => {
      getExtractionJob.mockResolvedValue(publishedJob({ approvedCount: 0 }));
      const res = await handler(event('quiz-1'));
      expect(res.statusCode).toBe(404);
    });
  });

  describe('successful response', () => {
    it('returns 200 with quiz detail', async () => {
      getExtractionJob.mockResolvedValue(publishedJob());
      const res = await handler(event('quiz-1'));
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body).toMatchObject({
        quizId: 'quiz-1',
        questionCount: 8,
        isPublic: true,
        createdAt: '2026-05-01T00:00:00.000Z',
        updatedAt: '2026-05-02T00:00:00.000Z',
      });
    });

    it('formats the filename as the title', async () => {
      getExtractionJob.mockResolvedValue(publishedJob({ fileName: 'offside-law-11.pdf' }));
      const res = await handler(event('quiz-1'));
      const body = JSON.parse(res.body);
      expect(body.title).toBe('Offside Law 11');
    });

    it('includes timeLimitMinutes when set', async () => {
      getExtractionJob.mockResolvedValue(publishedJob({ timeLimitMinutes: 20 }));
      const res = await handler(event('quiz-1'));
      const body = JSON.parse(res.body);
      expect(body.timeLimitMinutes).toBe(20);
    });

    it('omits optional fields when not set', async () => {
      getExtractionJob.mockResolvedValue(
        publishedJob({ timeLimitMinutes: undefined, lawFilter: undefined })
      );
      const res = await handler(event('quiz-1'));
      const body = JSON.parse(res.body);
      expect(body).not.toHaveProperty('timeLimitMinutes');
      expect(body).not.toHaveProperty('lawFilter');
    });
  });

  it('returns 500 when DynamoDB throws', async () => {
    getExtractionJob.mockRejectedValue(new Error('boom'));
    const res = await handler(event('quiz-1'));
    expect(res.statusCode).toBe(500);
  });
});
