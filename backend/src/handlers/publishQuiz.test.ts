import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildApiGatewayEvent } from '../lib/test-utils.js';
import type { ExtractionJobItem } from '../lib/types.js';

const { getExtractionJob, publishJob, unpublishJob } = vi.hoisted(() => ({
  getExtractionJob: vi.fn(),
  publishJob: vi.fn().mockResolvedValue(undefined),
  unpublishJob: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../lib/dynamodb.js', () => ({
  getExtractionJob,
  publishJob,
  unpublishJob,
}));

import { handler } from './publishQuiz.js';

function completedJob(overrides: Partial<ExtractionJobItem> = {}): ExtractionJobItem {
  return {
    PK: 'JOB#job-1',
    SK: 'METADATA',
    Type: 'ExtractionJob',
    jobId: 'job-1',
    s3Key: 'uploads/quiz.pdf',
    fileName: 'quiz.pdf',
    status: 'completed',
    totalQuestions: 10,
    approvedCount: 8,
    pendingCount: 0,
    rejectedCount: 2,
    duplicateCount: 0,
    published: false,
    isPublic: false,
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
    ...overrides,
  };
}

function event(jobId?: string, body?: unknown) {
  return buildApiGatewayEvent({
    httpMethod: 'PUT',
    pathParameters: jobId ? { id: jobId } : null,
    body: body !== undefined ? JSON.stringify(body) : null,
  });
}

describe('publishQuiz', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    publishJob.mockResolvedValue(undefined);
    unpublishJob.mockResolvedValue(undefined);
  });

  describe('input validation', () => {
    it('returns 400 when job ID is missing', async () => {
      const res = await handler(buildApiGatewayEvent({ httpMethod: 'PUT' }));
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toMatch(/job id/i);
    });

    it('returns 400 when body is not valid JSON', async () => {
      const res = await handler(
        buildApiGatewayEvent({
          httpMethod: 'PUT',
          pathParameters: { id: 'job-1' },
          body: 'not json',
        })
      );
      expect(res.statusCode).toBe(400);
    });
  });

  describe('job lookup', () => {
    it('returns 404 when job does not exist', async () => {
      getExtractionJob.mockResolvedValue(null);
      const res = await handler(event('job-1', { publish: true }));
      expect(res.statusCode).toBe(404);
    });
  });

  describe('publish constraints', () => {
    it('returns 400 when trying to publish a non-completed job', async () => {
      getExtractionJob.mockResolvedValue(completedJob({ status: 'processing' }));
      const res = await handler(event('job-1', { publish: true }));
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toMatch(/completed/i);
    });

    it('returns 400 when trying to publish a job with no approved questions', async () => {
      getExtractionJob.mockResolvedValue(completedJob({ approvedCount: 0 }));
      const res = await handler(event('job-1', { publish: true }));
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toMatch(/no approved/i);
    });
  });

  describe('publish', () => {
    it('publishes a completed job with approved questions', async () => {
      getExtractionJob.mockResolvedValue(completedJob());
      const res = await handler(event('job-1', { publish: true }));
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.published).toBe(true);
      expect(publishJob).toHaveBeenCalledWith('job-1', false);
    });

    it('publishes as public when isPublic is true', async () => {
      getExtractionJob.mockResolvedValue(completedJob());
      const res = await handler(event('job-1', { publish: true, isPublic: true }));
      expect(res.statusCode).toBe(200);
      expect(publishJob).toHaveBeenCalledWith('job-1', true);
    });

    it('publishes with default body when no body is provided', async () => {
      getExtractionJob.mockResolvedValue(completedJob());
      const res = await handler(
        buildApiGatewayEvent({ httpMethod: 'PUT', pathParameters: { id: 'job-1' } })
      );
      expect(res.statusCode).toBe(200);
      expect(publishJob).toHaveBeenCalled();
    });
  });

  describe('unpublish', () => {
    it('unpublishes a published job', async () => {
      getExtractionJob.mockResolvedValue(completedJob({ published: true }));
      const res = await handler(event('job-1', { publish: false }));
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.published).toBe(false);
      expect(unpublishJob).toHaveBeenCalledWith('job-1');
      expect(publishJob).not.toHaveBeenCalled();
    });
  });

  it('returns 500 when DynamoDB throws', async () => {
    getExtractionJob.mockRejectedValue(new Error('db error'));
    const res = await handler(event('job-1', { publish: true }));
    expect(res.statusCode).toBe(500);
  });
});
