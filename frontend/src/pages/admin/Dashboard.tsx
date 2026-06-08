import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getExtractionJobs, getQuestionBank, getAdminAnalytics } from '../../api/client';
import { useAccessToken } from '../../hooks/useAccessToken';
import type { ExtractionJob, BankQuestion, AdminAnalytics } from '../../types';

interface Stats {
  totalQuestions: number;
  approvedQuestions: number;
  pendingQuestions: number;
  rejectedQuestions: number;
  totalJobs: number;
  processingJobs: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentJobs, setRecentJobs] = useState<ExtractionJob[]>([]);
  const [pendingQuestions, setPendingQuestions] = useState<BankQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const { getToken } = useAccessToken();

  useEffect(() => {
    async function loadData() {
      try {
        const token = await getToken();
        const [jobsRes, questionsRes, pendingRes] = await Promise.all([
          getExtractionJobs(token),
          getQuestionBank(token, { limit: 200 }),
          getQuestionBank(token, { status: 'pending_review', limit: 5 }),
        ]);

        const questions = questionsRes.questions;
        setStats({
          totalQuestions: questions.length,
          approvedQuestions: questions.filter((q) => q.status === 'approved').length,
          pendingQuestions: questions.filter((q) => q.status === 'pending_review').length,
          rejectedQuestions: questions.filter((q) => q.status === 'rejected').length,
          totalJobs: jobsRes.jobs.length,
          processingJobs: jobsRes.jobs.filter((j) => j.status === 'processing').length,
        });

        setRecentJobs(jobsRes.jobs.slice(0, 5));
        setPendingQuestions(pendingRes.questions);
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [getToken]);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const token = await getToken();
        const data = await getAdminAnalytics(token);
        setAnalytics(data);
      } catch (error) {
        console.error('Error loading analytics:', error);
      } finally {
        setAnalyticsLoading(false);
      }
    }
    loadAnalytics();
  }, [getToken]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600">Manage PDF extraction and question review</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Total Questions</div>
          <div className="mt-1 text-3xl font-bold text-gray-900">{stats?.totalQuestions || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Approved</div>
          <div className="mt-1 text-3xl font-bold text-green-600">
            {stats?.approvedQuestions || 0}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Pending Review</div>
          <div className="mt-1 text-3xl font-bold text-yellow-600">
            {stats?.pendingQuestions || 0}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Rejected</div>
          <div className="mt-1 text-3xl font-bold text-red-600">
            {stats?.rejectedQuestions || 0}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Recent Jobs */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Jobs</h2>
            <Link to="/admin/jobs" className="text-sm text-primary-600 hover:text-primary-700">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-200">
            {recentJobs.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No extraction jobs yet.{' '}
                <Link to="/admin/upload" className="text-primary-600 hover:underline">
                  Upload a PDF
                </Link>
              </div>
            ) : (
              recentJobs.map((job) => (
                <Link
                  key={job.jobId}
                  to={`/admin/jobs/${job.jobId}`}
                  className="block px-6 py-4 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{job.fileName}</div>
                      <div className="text-sm text-gray-500">
                        {job.totalQuestions} questions extracted
                      </div>
                    </div>
                    <StatusBadge status={job.status} />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Pending Review */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Pending Review</h2>
            <Link to="/admin/review" className="text-sm text-primary-600 hover:text-primary-700">
              Review all
            </Link>
          </div>
          <div className="divide-y divide-gray-200">
            {pendingQuestions.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">No questions pending review</div>
            ) : (
              pendingQuestions.map((question) => (
                <div key={question.questionId} className="px-6 py-4">
                  <div className="text-sm text-gray-900 line-clamp-2">{question.text}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs text-gray-500">{question.law}</span>
                    <span className="text-xs text-gray-400">|</span>
                    <ConfidenceBadge confidence={question.confidence} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Link to="/admin/upload" className="btn-primary">
            Upload New PDF
          </Link>
          <Link
            to="/admin/create"
            className="px-4 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700"
          >
            Create Manual Quiz
          </Link>
          <Link to="/admin/review" className="btn-secondary">
            Review Questions ({stats?.pendingQuestions || 0})
          </Link>
          <Link to="/admin/questions" className="btn-secondary">
            Browse Question Bank
          </Link>
        </div>
      </div>

      {/* Learner Analytics */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Learner Analytics</h2>
        {analyticsLoading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
            <span>Loading analytics...</span>
          </div>
        ) : analytics ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm font-medium text-gray-500">Total Learners</div>
                <div className="mt-1 text-3xl font-bold text-gray-900">
                  {analytics.overview.totalUsers}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm font-medium text-gray-500">Total Attempts</div>
                <div className="mt-1 text-3xl font-bold text-gray-900">
                  {analytics.overview.totalAttempts}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm font-medium text-gray-500">Platform Avg Score</div>
                <div className="mt-1 text-3xl font-bold text-primary-600">
                  {analytics.overview.platformAvgScore.toFixed(1)}%
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm font-medium text-gray-500">Published Quizzes</div>
                <div className="mt-1 text-3xl font-bold text-gray-900">
                  {analytics.overview.publishedQuizzes}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-sm font-medium text-gray-500">Questions Available</div>
                <div className="mt-1 text-3xl font-bold text-gray-900">
                  {analytics.overview.totalQuestionsAvailable}
                </div>
              </div>
            </div>

            {Object.keys(analytics.byLaw).length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Performance by Law</h3>
                <div className="space-y-3">
                  {(
                    Object.entries(analytics.byLaw) as [
                      string,
                      { attempts: number; avgScore: number },
                    ][]
                  )
                    .sort(([a], [b]) => {
                      const num = (s: string) => parseInt(s.replace('Law ', ''), 10);
                      return num(a) - num(b);
                    })
                    .map(([law, data]) => {
                      const pct = Math.round(data.avgScore);
                      const barColor =
                        pct >= 90
                          ? 'bg-green-500'
                          : pct >= 70
                            ? 'bg-blue-500'
                            : pct >= 50
                              ? 'bg-amber-500'
                              : 'bg-red-500';
                      return (
                        <div key={law}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="font-medium text-gray-700">{law}</span>
                            <span className="text-gray-500">
                              {pct}% avg · {data.attempts} attempts
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                              className={`${barColor} h-2 rounded-full transition-all`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {analytics.streakLeaderboard && analytics.streakLeaderboard.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4">
                  🔥 Streak Leaderboard
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b">
                        <th className="pb-2 font-medium">#</th>
                        <th className="pb-2 font-medium">User</th>
                        <th className="pb-2 font-medium text-right">Current Streak</th>
                        <th className="pb-2 font-medium text-right">Longest Streak</th>
                        <th className="pb-2 font-medium text-right">Last Active</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {analytics.streakLeaderboard.map((entry, idx) => (
                        <tr key={entry.userId}>
                          <td className="py-2 text-gray-400">{idx + 1}</td>
                          <td className="py-2 font-medium text-gray-900 truncate max-w-[200px]">
                            {entry.userId.includes('|')
                              ? entry.userId.split('|')[1]?.slice(0, 12) + '…'
                              : entry.userId.slice(0, 16)}
                          </td>
                          <td className="py-2 text-right">
                            <span className="inline-flex items-center gap-1 text-orange-600 font-semibold">
                              🔥 {entry.currentStreak}
                            </span>
                          </td>
                          <td className="py-2 text-right text-gray-600">{entry.longestStreak}</td>
                          <td className="py-2 text-right text-gray-400">
                            {entry.lastStudyDate || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-gray-500">Analytics unavailable.</p>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    pending: 'bg-gray-100 text-gray-800',
    processing: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  };

  return (
    <span
      className={`px-2 py-1 text-xs font-medium rounded-full ${
        styles[status as keyof typeof styles] || styles.pending
      }`}
    >
      {status}
    </span>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percent = Math.round(confidence * 100);
  let color = 'text-red-600';
  if (confidence >= 0.95) color = 'text-green-600';
  else if (confidence >= 0.7) color = 'text-yellow-600';

  return <span className={`text-xs font-medium ${color}`}>{percent}% confidence</span>;
}
