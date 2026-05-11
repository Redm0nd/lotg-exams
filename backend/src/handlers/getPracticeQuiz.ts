import type { APIGatewayProxyEvent, APIGatewayProxyResult } from '../lib/types.js';
import type { Law, BankQuestionItem } from '../lib/types.js';
import { getUserStats, getQuestionsByLaw, shuffleArray } from '../lib/dynamodb.js';
import { successResponse, errorResponse } from '../lib/response.js';
import { verifyToken } from '../lib/verifyToken.js';

const ALL_LAWS: Law[] = [
  'Law 1', 'Law 2', 'Law 3', 'Law 4', 'Law 5', 'Law 6', 'Law 7', 'Law 8', 'Law 9',
  'Law 10', 'Law 11', 'Law 12', 'Law 13', 'Law 14', 'Law 15', 'Law 16', 'Law 17',
];

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userId = await verifyToken(
    event.headers?.Authorization || event.headers?.authorization
  );
  if (!userId) return errorResponse('Authentication required', 401);

  const isMock = event.queryStringParameters?.mock === 'true';
  const defaultLimit = isMock ? 25 : 20;
  const maxLimit = isMock ? 25 : 40;
  const limit = Math.min(
    parseInt(event.queryStringParameters?.limit || String(defaultLimit), 10),
    maxLimit
  );

  try {
    const stats = isMock ? null : await getUserStats(userId);
    const byLaw = stats?.byLaw || {};

    // Mock exam: equal weights across all laws (random selection).
    // Practice: weaker laws get higher weight; untried laws default to 25.
    const weights: Partial<Record<Law, number>> = {};
    for (const law of ALL_LAWS) {
      if (isMock) {
        weights[law] = 1;
      } else {
        const lawStats = byLaw[law];
        weights[law] = lawStats && lawStats.attempts > 0
          ? Math.max(10, 100 - lawStats.avgScore)
          : 25;
      }
    }

    const totalWeight = ALL_LAWS.reduce((s, l) => s + (weights[l] ?? 0), 0);

    // Allocate question budget per law, proportional to weight
    const lawBudgets: Partial<Record<Law, number>> = {};
    let allocated = 0;
    for (const law of ALL_LAWS) {
      const budget = Math.round(((weights[law] ?? 0) / totalWeight) * limit);
      lawBudgets[law] = budget;
      allocated += budget;
    }
    // Distribute rounding remainder to the highest-weight law
    const remainder = limit - allocated;
    if (remainder !== 0) {
      const heaviest = ALL_LAWS.reduce((a, b) =>
        (weights[a] ?? 0) >= (weights[b] ?? 0) ? a : b
      );
      lawBudgets[heaviest] = (lawBudgets[heaviest] ?? 0) + remainder;
    }

    // Fetch and sample questions per law in parallel
    const selected: BankQuestionItem[] = [];
    await Promise.all(
      ALL_LAWS.map(async (law) => {
        const budget = lawBudgets[law] ?? 0;
        if (budget === 0) return;
        const questions = await getQuestionsByLaw(law, 'approved', 100);
        shuffleArray(questions).slice(0, budget).forEach((q) => selected.push(q));
      })
    );

    const shuffled = shuffleArray(selected);

    const avgBudget = limit / ALL_LAWS.length;
    const focusLaws = isMock ? [] : ALL_LAWS
      .filter((l) => byLaw[l]?.attempts && (lawBudgets[l] ?? 0) > avgBudget)
      .sort((a, b) => (lawBudgets[b] ?? 0) - (lawBudgets[a] ?? 0))
      .slice(0, 3);

    const questions = shuffled.map((q) => ({
      questionId: q.questionId,
      text: q.text,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      lawReference: q.lawReference,
    }));

    return successResponse({ questions, focusLaws });
  } catch (error) {
    console.error('Error generating practice quiz:', error);
    return errorResponse('Failed to generate practice quiz', 500);
  }
}
