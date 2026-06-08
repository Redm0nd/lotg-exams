import type { APIGatewayProxyEvent, APIGatewayProxyResult, Law, LawStats } from '../lib/types.js';
import { getAllExtractionJobs, getAllUserStats } from '../lib/dynamodb.js';
import { successResponse, errorResponse } from '../lib/response.js';

export interface AdminAnalyticsResponse {
  overview: {
    totalUsers: number;
    totalAttempts: number;
    platformAvgScore: number;
    publishedQuizzes: number;
    totalQuestionsAvailable: number;
  };
  byLaw: Partial<Record<Law, { attempts: number; avgScore: number }>>;
  streakLeaderboard: Array<{
    userId: string;
    currentStreak: number;
    longestStreak: number;
    lastStudyDate?: string;
  }>;
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const [jobs, userStats] = await Promise.all([getAllExtractionJobs(), getAllUserStats()]);

    const publishedJobs = jobs.filter((j) => j.published === true);
    const totalQuestionsAvailable = publishedJobs.reduce(
      (sum, j) => sum + (j.approvedCount || 0),
      0
    );

    const usersWithAttempts = userStats.filter((u) => u.totalAttempts > 0);
    const totalAttempts = userStats.reduce((sum, u) => sum + u.totalAttempts, 0);
    const platformAvgScore =
      usersWithAttempts.length > 0
        ? usersWithAttempts.reduce((sum, u) => sum + u.averageScore, 0) / usersWithAttempts.length
        : 0;

    // Merge per-law stats across all users
    const byLaw: Partial<Record<Law, { totalAttempts: number; totalCorrect: number }>> = {};
    for (const user of userStats) {
      for (const [law, stats] of Object.entries(user.byLaw || {}) as [Law, LawStats][]) {
        if (!byLaw[law]) byLaw[law] = { totalAttempts: 0, totalCorrect: 0 };
        byLaw[law]!.totalAttempts += stats.attempts;
        byLaw[law]!.totalCorrect += stats.totalCorrect;
      }
    }

    const byLawSummary: Partial<Record<Law, { attempts: number; avgScore: number }>> = {};
    for (const [law, data] of Object.entries(byLaw) as [
      Law,
      { totalAttempts: number; totalCorrect: number },
    ][]) {
      byLawSummary[law] = {
        attempts: data.totalAttempts,
        avgScore: data.totalAttempts > 0 ? (data.totalCorrect / data.totalAttempts) * 100 : 0,
      };
    }

    const response: AdminAnalyticsResponse = {
      overview: {
        totalUsers: userStats.length,
        totalAttempts,
        platformAvgScore: Math.round(platformAvgScore * 10) / 10,
        publishedQuizzes: publishedJobs.length,
        totalQuestionsAvailable,
      },
      byLaw: byLawSummary,
      streakLeaderboard: userStats
        .filter((u) => u.currentStreak > 0 || u.longestStreak > 0)
        .sort((a, b) => b.currentStreak - a.currentStreak || b.longestStreak - a.longestStreak)
        .slice(0, 10)
        .map((u) => ({
          userId: u.userId,
          currentStreak: u.currentStreak,
          longestStreak: u.longestStreak,
          lastStudyDate: u.lastStudyDate,
        })),
    };

    return successResponse(response);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return errorResponse('Failed to fetch analytics', 500);
  }
}
