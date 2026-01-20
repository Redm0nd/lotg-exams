import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  PutCommand,
  UpdateCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import type {
  QuizItem,
  QuestionItem,
  BankQuestionItem,
  ExtractionJobItem,
  QuestionStatus,
  Law,
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
    UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt, reviewedAt = :reviewedAt, reviewedBy = :reviewedBy',
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
    KeyConditionExpression: status
      ? '#law = :law AND #status = :status'
      : '#law = :law',
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
