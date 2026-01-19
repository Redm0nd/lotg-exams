import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { QuizItem, QuestionItem } from './types.js';

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
