import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildApiGatewayEvent } from '../lib/test-utils.js';
import type { ExtractionJobItem } from '../lib/types.js';

const { getPublishedJobs } = vi.hoisted(() => ({
  getPublishedJobs: vi.fn(),
}));

vi.mock('../lib/dynamodb.js', () => ({
  getPublishedJobs,
}));

import { handler } from './getQuizzes.js';

function publishedJob(overrides: Partial<ExtractionJobItem> = {}): ExtractionJobItem {
  return {
    PK: 'JOB#job-1',
    SK: 'METADATA',
    Type: 'ExtractionJob',
    jobId: 'job-1',
    s3Key: 'uploads/laws-of-the-game.pdf',
    fileName: 'laws-of-the-game.pdf',
    status: 'completed',
    totalQuestions: 20,
    approvedCount: 15,
    pendingCount: 0,
    rejectedCount: 5,
    duplicateCount: 0,
    published: true,
    isPublic: true,
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('getQuizzes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with empty array when no quizzes exist', async () => {
    getPublishedJobs.mockResolvedValue([]);
    const res = await handler(buildApiGatewayEvent());
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual([]);
  });

  it('returns 200 with quiz summaries from published jobs', async () => {
    getPublishedJobs.mockResolvedValue([publishedJob()]);
    const res = await handler(buildApiGatewayEvent());
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({
      quizId: 'job-1',
      questionCount: 15,
      isPublic: true,
      category: 'Laws of the Game',
    });
  });

  it('formats the filename as the quiz title', async () => {
    getPublishedJobs.mockResolvedValue([publishedJob({ fileName: 'laws-of-the-game-2024.pdf' })]);
    const res = await handler(buildApiGatewayEvent());
    const body = JSON.parse(res.body);
    expect(body[0].title).toBe('Laws Of The Game 2024');
  });

  it('uses the job description when set', async () => {
    getPublishedJobs.mockResolvedValue([
      publishedJob({ description: 'A curated LOTG quiz' }),
    ]);
    const res = await handler(buildApiGatewayEvent());
    const body = JSON.parse(res.body);
    expect(body[0].description).toBe('A curated LOTG quiz');
  });

  it('falls back to filename-based description when description is absent', async () => {
    getPublishedJobs.mockResolvedValue([publishedJob({ fileName: 'lotg.pdf', description: undefined })]);
    const res = await handler(buildApiGatewayEvent());
    const body = JSON.parse(res.body);
    expect(body[0].description).toMatch(/lotg\.pdf/);
  });

  it('includes optional fields when set on the job', async () => {
    getPublishedJobs.mockResolvedValue([
      publishedJob({ timeLimitMinutes: 30, questionsPerAttempt: 10, lawFilter: 'Law 1' }),
    ]);
    const res = await handler(buildApiGatewayEvent());
    const body = JSON.parse(res.body);
    expect(body[0].timeLimitMinutes).toBe(30);
    expect(body[0].questionsPerAttempt).toBe(10);
    expect(body[0].lawFilter).toBe('Law 1');
  });

  it('returns 500 when DynamoDB throws', async () => {
    getPublishedJobs.mockRejectedValue(new Error('db error'));
    const res = await handler(buildApiGatewayEvent());
    expect(res.statusCode).toBe(500);
  });
});
