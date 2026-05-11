import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  PutCommand,
  UpdateCommand,
  BatchWriteCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import type {
  QuizItem,
  QuestionItem,
  BankQuestionItem,
  ExtractionJobItem,
  QuestionStatus,
  Law,
  UserAttemptItem,
  UserStatsItem,
  PerQuestionResult,
  LawStats,
} from './types.js';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || 'lotg-exams-prod-quizzes';

/**
 * Get all quizzes (metadata only)
 */
export async function getAllQuizzes(): Promise<QuizItem[]> {
  const params = {
    TableName: TABLE_NAME,
    IndexName: 'Type-createdAt-index',
    KeyConditionExpression: '#type = :type',
    ExpressionAttributeNames: {
      '#type': 'Type',
    },
    ExpressionAttributeValues: {
      ':type': 'Quiz',
    },
  };

  const result = await docClient.send(new QueryCommand(params));
  return (result.Items || []) as QuizItem[];
}

/**
 * Get quiz metadata by ID
 */
export async function getQuizById(quizId: string): Promise<QuizItem | null> {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      PK: `QUIZ#${quizId}`,
      SK: 'METADATA',
    },
  };

  const result = await docClient.send(new GetCommand(params));
  return (result.Item as QuizItem) || null;
}

/**
 * Get all questions for a quiz
 */
export async function getQuestionsByQuizId(quizId: string): Promise<QuestionItem[]> {
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `QUIZ#${quizId}`,
      ':sk': 'QUESTION#',
    },
  };

  const result = await docClient.send(new QueryCommand(params));
  return (result.Items || []) as QuestionItem[];
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ============================================================================
// Question Bank Operations
// ============================================================================

/**
 * Create a new extraction job
 */
export async function createExtractionJob(job: ExtractionJobItem): Promise<void> {
  const params = {
    TableName: TABLE_NAME,
    Item: job,
  };
  await docClient.send(new PutCommand(params));
}

/**
 * Update extraction job status and counts
 */
export async function updateExtractionJob(
  jobId: string,
  updates: Partial<ExtractionJobItem>
): Promise<void> {
  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, unknown> = {};

  Object.entries(updates).forEach(([key, value]) => {
    if (key !== 'PK' && key !== 'SK' && key !== 'jobId' && value !== undefined) {
      updateExpressions.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = value;
    }
  });

  if (updateExpressions.length === 0) return;

  const params = {
    TableName: TABLE_NAME,
    Key: {
      PK: `JOB#${jobId}`,
      SK: 'METADATA',
    },
    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
  };

  await docClient.send(new UpdateCommand(params));
}

/**
 * Get extraction job by ID
 */
export async function getExtractionJob(jobId: string): Promise<ExtractionJobItem | null> {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      PK: `JOB#${jobId}`,
      SK: 'METADATA',
    },
  };

  const result = await docClient.send(new GetCommand(params));
  return (result.Item as ExtractionJobItem) || null;
}

/**
 * Get all extraction jobs
 */
export async function getAllExtractionJobs(): Promise<ExtractionJobItem[]> {
  const params = {
    TableName: TABLE_NAME,
    IndexName: 'Type-createdAt-index',
    KeyConditionExpression: '#type = :type',
    ExpressionAttributeNames: {
      '#type': 'Type',
    },
    ExpressionAttributeValues: {
      ':type': 'ExtractionJob',
    },
    ScanIndexForward: false, // Most recent first
  };

  const result = await docClient.send(new QueryCommand(params));
  return (result.Items || []) as ExtractionJobItem[];
}

/**
 * Save a bank question
 */
export async function saveBankQuestion(question: BankQuestionItem): Promise<void> {
  const params = {
    TableName: TABLE_NAME,
    Item: question,
  };
  await docClient.send(new PutCommand(params));
}

/**
 * Batch save bank questions
 */
export async function batchSaveBankQuestions(questions: BankQuestionItem[]): Promise<void> {
  // DynamoDB batch write can only handle 25 items at a time
  const chunks = [];
  for (let i = 0; i < questions.length; i += 25) {
    chunks.push(questions.slice(i, i + 25));
  }

  for (const chunk of chunks) {
    const params = {
      RequestItems: {
        [TABLE_NAME]: chunk.map((q) => ({
          PutRequest: {
            Item: q,
          },
        })),
      },
    };
    await docClient.send(new BatchWriteCommand(params));
  }
}

/**
 * Get bank question by ID
 */
export async function getBankQuestion(questionId: string): Promise<BankQuestionItem | null> {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      PK: `QUESTION#${questionId}`,
      SK: 'METADATA',
    },
  };

  const result = await docClient.send(new GetCommand(params));
  return (result.Item as BankQuestionItem) || null;
}

/**
 * Update bank question status (approve/reject)
 */
export async function updateBankQuestionStatus(
  questionId: string,
  status: QuestionStatus,
  reviewedBy?: string
): Promise<void> {
  const now = new Date().toISOString();
  const params = {
    TableName: TABLE_NAME,
    Key: {
      PK: `QUESTION#${questionId}`,
      SK: 'METADATA',
    },
    UpdateExpression:
      'SET #status = :status, updatedAt = :updatedAt, reviewedAt = :reviewedAt, reviewedBy = :reviewedBy',
    ExpressionAttributeNames: {
      '#status': 'status',
    },
    ExpressionAttributeValues: {
      ':status': status,
      ':updatedAt': now,
      ':reviewedAt': now,
      ':reviewedBy': reviewedBy || 'admin',
    },
  };

  await docClient.send(new UpdateCommand(params));
}

/**
 * Update the editable content of a bank question (text, options,
 * correctAnswer, explanation, law, lawReference). Only the fields
 * present in `updates` are written; everything else is left untouched.
 */
export async function updateBankQuestionContent(
  questionId: string,
  updates: Partial<
    Pick<BankQuestionItem, 'text' | 'options' | 'correctAnswer' | 'explanation' | 'law' | 'lawReference'>
  >
): Promise<void> {
  const setExpressions: string[] = ['updatedAt = :updatedAt'];
  const attributeNames: Record<string, string> = {};
  const attributeValues: Record<string, unknown> = {
    ':updatedAt': new Date().toISOString(),
  };

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue;
    setExpressions.push(`#${key} = :${key}`);
    attributeNames[`#${key}`] = key;
    attributeValues[`:${key}`] = value;
  }

  if (setExpressions.length === 1) {
    // Nothing besides updatedAt to write - skip the round trip.
    return;
  }

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `QUESTION#${questionId}`, SK: 'METADATA' },
      UpdateExpression: `SET ${setExpressions.join(', ')}`,
      ExpressionAttributeNames: attributeNames,
      ExpressionAttributeValues: attributeValues,
    })
  );
}

/**
 * Get questions by status (for review queue)
 */
export async function getQuestionsByStatus(
  status: QuestionStatus,
  limit = 50
): Promise<BankQuestionItem[]> {
  const params = {
    TableName: TABLE_NAME,
    IndexName: 'Status-CreatedAt-index',
    KeyConditionExpression: '#status = :status',
    ExpressionAttributeNames: {
      '#status': 'status',
    },
    ExpressionAttributeValues: {
      ':status': status,
    },
    Limit: limit,
    ScanIndexForward: true, // Oldest first for review queue
  };

  const result = await docClient.send(new QueryCommand(params));
  return (result.Items || []) as BankQuestionItem[];
}

/**
 * Get questions by law and optionally status
 */
export async function getQuestionsByLaw(
  law: Law,
  status?: QuestionStatus,
  limit = 50
): Promise<BankQuestionItem[]> {
  const params: {
    TableName: string;
    IndexName: string;
    KeyConditionExpression: string;
    ExpressionAttributeNames: Record<string, string>;
    ExpressionAttributeValues: Record<string, unknown>;
    Limit: number;
  } = {
    TableName: TABLE_NAME,
    IndexName: 'Law-Status-index',
    KeyConditionExpression: status ? '#law = :law AND #status = :status' : '#law = :law',
    ExpressionAttributeNames: {
      '#law': 'law',
      ...(status && { '#status': 'status' }),
    },
    ExpressionAttributeValues: {
      ':law': law,
      ...(status && { ':status': status }),
    },
    Limit: limit,
  };

  const result = await docClient.send(new QueryCommand(params));
  return (result.Items || []) as BankQuestionItem[];
}

/**
 * Get all bank questions (paginated)
 */
export async function getAllBankQuestions(limit = 100): Promise<BankQuestionItem[]> {
  const params = {
    TableName: TABLE_NAME,
    IndexName: 'Type-createdAt-index',
    KeyConditionExpression: '#type = :type',
    ExpressionAttributeNames: {
      '#type': 'Type',
    },
    ExpressionAttributeValues: {
      ':type': 'BankQuestion',
    },
    Limit: limit,
    ScanIndexForward: false, // Most recent first
  };

  const result = await docClient.send(new QueryCommand(params));
  return (result.Items || []) as BankQuestionItem[];
}

/**
 * Check if a question with the same hash already exists
 */
export async function questionExistsByHash(hash: string): Promise<boolean> {
  const params = {
    TableName: TABLE_NAME,
    IndexName: 'Hash-index',
    KeyConditionExpression: '#hash = :hash',
    ExpressionAttributeNames: {
      '#hash': 'hash',
    },
    ExpressionAttributeValues: {
      ':hash': hash,
    },
    Limit: 1,
  };

  const result = await docClient.send(new QueryCommand(params));
  return (result.Items?.length || 0) > 0;
}

/**
 * Get questions for a specific job
 */
export async function getQuestionsByJobId(jobId: string): Promise<BankQuestionItem[]> {
  const params = {
    TableName: TABLE_NAME,
    IndexName: 'Type-createdAt-index',
    KeyConditionExpression: '#type = :type',
    FilterExpression: 'jobId = :jobId',
    ExpressionAttributeNames: {
      '#type': 'Type',
    },
    ExpressionAttributeValues: {
      ':type': 'BankQuestion',
      ':jobId': jobId,
    },
  };

  const result = await docClient.send(new QueryCommand(params));
  return (result.Items || []) as BankQuestionItem[];
}

/**
 * Get approved questions for a specific job using the JobId-Status-index GSI
 */
export async function getApprovedQuestionsByJobId(jobId: string): Promise<BankQuestionItem[]> {
  const params = {
    TableName: TABLE_NAME,
    IndexName: 'JobId-Status-index',
    KeyConditionExpression: 'jobId = :jobId AND #status = :status',
    ExpressionAttributeNames: {
      '#status': 'status',
    },
    ExpressionAttributeValues: {
      ':jobId': jobId,
      ':status': 'approved',
    },
  };

  const result = await docClient.send(new QueryCommand(params));
  return (result.Items || []) as BankQuestionItem[];
}

/**
 * Get all published extraction jobs (for quiz listing)
 */
export async function getPublishedJobs(): Promise<ExtractionJobItem[]> {
  const params = {
    TableName: TABLE_NAME,
    IndexName: 'Type-createdAt-index',
    KeyConditionExpression: '#type = :type',
    FilterExpression: 'published = :published AND approvedCount > :zero',
    ExpressionAttributeNames: {
      '#type': 'Type',
    },
    ExpressionAttributeValues: {
      ':type': 'ExtractionJob',
      ':published': true,
      ':zero': 0,
    },
    ScanIndexForward: false, // Most recent first
  };

  const result = await docClient.send(new QueryCommand(params));
  return (result.Items || []) as ExtractionJobItem[];
}

/**
 * Publish a job (make it visible as a quiz on the homepage)
 */
export async function publishJob(jobId: string, isPublic = false): Promise<void> {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      PK: `JOB#${jobId}`,
      SK: 'METADATA',
    },
    UpdateExpression: 'SET published = :published, isPublic = :isPublic, updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':published': true,
      ':isPublic': isPublic,
      ':updatedAt': new Date().toISOString(),
    },
  };

  await docClient.send(new UpdateCommand(params));
}

/**
 * Unpublish a job (hide it from the homepage)
 */
export async function unpublishJob(jobId: string): Promise<void> {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      PK: `JOB#${jobId}`,
      SK: 'METADATA',
    },
    UpdateExpression: 'SET published = :published, updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':published': false,
      ':updatedAt': new Date().toISOString(),
    },
  };

  await docClient.send(new UpdateCommand(params));
}

/**
 * Update question usage tracking (increment usageCount and set lastUsedAt)
 */
export async function updateQuestionUsage(questionIds: string[]): Promise<void> {
  const now = new Date().toISOString();

  // Update each question's usage count
  await Promise.all(
    questionIds.map((questionId) =>
      docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: `QUESTION#${questionId}`,
            SK: 'METADATA',
          },
          UpdateExpression:
            'SET usageCount = if_not_exists(usageCount, :zero) + :inc, lastUsedAt = :now',
          ExpressionAttributeValues: {
            ':zero': 0,
            ':inc': 1,
            ':now': now,
          },
        })
      )
    )
  );
}

/**
 * Delete an extraction job (quiz) by ID
 */
export async function deleteExtractionJob(jobId: string): Promise<void> {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `JOB#${jobId}`,
        SK: 'METADATA',
      },
    })
  );
}

/**
 * Get all UserStats items for platform-wide analytics
 */
export async function getAllUserStats(): Promise<UserStatsItem[]> {
  const params = {
    TableName: TABLE_NAME,
    IndexName: 'Type-createdAt-index',
    KeyConditionExpression: '#type = :type',
    ExpressionAttributeNames: {
      '#type': 'Type',
    },
    ExpressionAttributeValues: {
      ':type': 'UserStats',
    },
  };

  const result = await docClient.send(new QueryCommand(params));
  return (result.Items || []) as UserStatsItem[];
}

// ============================================================================
// User Progress Tracking
// ============================================================================

/**
 * Save a quiz attempt for a user
 */
export async function saveUserAttempt(attempt: UserAttemptItem): Promise<void> {
  await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: attempt }));
}

/**
 * Get paginated quiz attempts for a user, most recent first
 */
export async function getUserAttempts(
  userId: string,
  limit = 20,
  lastEvaluatedKey?: Record<string, unknown>
): Promise<{ items: UserAttemptItem[]; lastEvaluatedKey?: Record<string, unknown> }> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':prefix': 'ATTEMPT#',
      },
      ScanIndexForward: false,
      Limit: limit,
      ...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey }),
    })
  );

  return {
    items: (result.Items || []) as UserAttemptItem[],
    lastEvaluatedKey: result.LastEvaluatedKey as Record<string, unknown> | undefined,
  };
}

/**
 * Get aggregated stats for a user
 */
export async function getUserStats(userId: string): Promise<UserStatsItem | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: 'STATS' },
    })
  );
  return (result.Item as UserStatsItem) || null;
}

/**
 * Update (or create) aggregated stats for a user after a new attempt.
 * Reads the existing stats, merges in the new attempt, then writes back.
 */
export async function updateUserStats(
  userId: string,
  percentage: number,
  questionResults: PerQuestionResult[]
): Promise<void> {
  const now = new Date().toISOString();
  const existing = await getUserStats(userId);

  const totalAttempts = (existing?.totalAttempts ?? 0) + 1;
  const prevAvg = existing?.averageScore ?? 0;
  const averageScore = Math.round(
    (prevAvg * (totalAttempts - 1) + percentage) / totalAttempts
  );
  const bestScore = Math.max(existing?.bestScore ?? 0, percentage);

  const byLaw: Partial<Record<string, LawStats>> = { ...(existing?.byLaw ?? {}) };
  for (const qr of questionResults) {
    const key = qr.law;
    const prev = byLaw[key];
    const attempts = (prev?.attempts ?? 0) + 1;
    const totalCorrect = (prev?.totalCorrect ?? 0) + (qr.isCorrect ? 1 : 0);
    byLaw[key] = {
      attempts,
      totalCorrect,
      avgScore: Math.round((totalCorrect / attempts) * 100),
      lastAttempt: now,
    };
  }

  const stats: UserStatsItem = {
    PK: `USER#${userId}`,
    SK: 'STATS',
    Type: 'UserStats',
    userId,
    totalAttempts,
    averageScore,
    bestScore,
    byLaw: byLaw as UserStatsItem['byLaw'],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: stats }));
}

