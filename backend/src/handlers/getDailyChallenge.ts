import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  BankQuestionItem,
} from '../lib/types.js';
import { getUserStats, updateUserStats } from '../lib/dynamodb.js';
import { successResponse, errorResponse } from '../lib/response.js';
import { verifyToken } from '../lib/verifyToken.js';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import type { PerQuestionResult } from '../lib/types.js';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME || 'lotg-exams-prod-quizzes';
const DAILY_QUESTION_COUNT = 5;

/** Simple seeded PRNG (mulberry32) for deterministic question selection */
function seededRandom(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash;
}

function getToday(): string {
  return new Date().toISOString().substring(0, 10);
}

async function getDailyCompletion(userId: string, date: string) {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: `DAILY#${date}` },
    })
  );
  return result.Item || null;
}

async function getAllApprovedQuestions(): Promise<BankQuestionItem[]> {
  const items: BankQuestionItem[] = [];
  let lastKey: Record<string, unknown> | undefined;
  do {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'Status-CreatedAt-index',
        KeyConditionExpression: '#status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':status': 'approved' },
        ExclusiveStartKey: lastKey,
      })
    );
    items.push(...((result.Items || []) as BankQuestionItem[]));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);
  return items;
}

function selectDailyQuestions(
  questions: BankQuestionItem[],
  date: string,
  userId: string
): BankQuestionItem[] {
  if (questions.length <= DAILY_QUESTION_COUNT) return questions;
  const seed = hashString(`${date}:${userId}`);
  const rng = seededRandom(seed);
  // Fisher-Yates with seeded RNG
  const pool = [...questions];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, DAILY_QUESTION_COUNT);
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userId = await verifyToken(event.headers?.Authorization || event.headers?.authorization);
  if (!userId) return errorResponse('Authentication required', 401);

  const today = getToday();

  if (event.httpMethod === 'GET') {
    try {
      const [completion, stats, allQuestions] = await Promise.all([
        getDailyCompletion(userId, today),
        getUserStats(userId),
        getAllApprovedQuestions(),
      ]);

      const selected = selectDailyQuestions(allQuestions, today, userId);
      const questions = selected.map((q) => ({
        questionId: q.questionId,
        text: q.text,
        options: q.options,
        correctAnswer: completion ? q.correctAnswer : undefined,
        explanation: completion ? q.explanation : undefined,
        lawReference: completion ? q.lawReference : undefined,
      }));

      return successResponse({
        date: today,
        questions,
        completed: !!completion,
        score: completion?.score ?? null,
        streak: stats?.currentStreak ?? 0,
      });
    } catch (error) {
      console.error('Error fetching daily challenge:', error);
      return errorResponse('Failed to fetch daily challenge', 500);
    }
  }

  if (event.httpMethod === 'POST') {
    try {
      const existing = await getDailyCompletion(userId, today);
      if (existing) return errorResponse("Already completed today's challenge", 409);

      const body = JSON.parse(event.body || '{}');
      const answers: Array<{ questionId: string; selectedOption: number }> = body.answers;
      if (!answers?.length) return errorResponse('answers array required', 400);

      const allQuestions = await getAllApprovedQuestions();
      const selected = selectDailyQuestions(allQuestions, today, userId);
      const questionMap = new Map(selected.map((q) => [q.questionId, q]));

      let correct = 0;
      const questionResults: PerQuestionResult[] = [];
      const results = answers
        .map((a) => {
          const q = questionMap.get(a.questionId);
          if (!q) return null;
          const isCorrect = a.selectedOption === q.correctAnswer;
          if (isCorrect) correct++;
          questionResults.push({
            questionId: q.questionId,
            selectedOption: a.selectedOption,
            isCorrect,
            law: q.law,
          });
          return {
            questionId: q.questionId,
            text: q.text,
            options: q.options,
            selectedOption: a.selectedOption,
            correctOption: q.correctAnswer,
            isCorrect,
            explanation: q.explanation,
            lawReference: q.lawReference,
          };
        })
        .filter(Boolean);

      const percentage = Math.round((correct / DAILY_QUESTION_COUNT) * 100);

      // Save completion
      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            PK: `USER#${userId}`,
            SK: `DAILY#${today}`,
            Type: 'DailyCompletion',
            userId,
            date: today,
            score: correct,
            total: DAILY_QUESTION_COUNT,
            percentage,
            createdAt: new Date().toISOString(),
          },
        })
      );

      // Update user stats (drives streak)
      await updateUserStats(userId, percentage, questionResults);

      const stats = await getUserStats(userId);

      return successResponse({
        results,
        score: { correct, total: DAILY_QUESTION_COUNT, percentage },
        streak: stats?.currentStreak ?? 1,
      });
    } catch (error) {
      console.error('Error submitting daily challenge:', error);
      return errorResponse('Failed to submit daily challenge', 500);
    }
  }

  return errorResponse('Method not allowed', 405);
}
