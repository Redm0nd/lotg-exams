import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getExtractionJobs, publishQuiz } from '../../api/client';
import { useAccessToken } from '../../hooks/useAccessToken';
import type { ExtractionJob } from '../../types';

function formatTitle(fileName: string): string {
  return fileName
    .replace(/\.pdf$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ManageQuizzes() {
  const { getToken } = useAccessToken();
  const [quizzes, setQuizzes] = useState<ExtractionJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    getToken()
      .then((token) => getExtractionJobs(token))
      .then((res) => setQuizzes(res.jobs.filter((j) => j.published)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [getToken]);

  const toggleVisibility = async (quiz: ExtractionJob) => {
    setToggling(quiz.jobId);
    try {
      const token = await getToken();
      await publishQuiz(quiz.jobId, token, true, !quiz.isPublic);
      setQuizzes((prev) =>
        prev.map((q) => (q.jobId === quiz.jobId ? { ...q, isPublic: !q.isPublic } : q))
      );
    } catch (err) {
      console.error('Toggle failed:', err);
    } finally {
      setToggling(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-gray-600">Loading quizzes...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Quizzes</h1>
          <p className="text-gray-600">View and manage all published quizzes</p>
        </div>
        <Link
          to="/admin/create"
          className="px-4 py-2 rounded-lg font-medium bg-primary-600 text-white hover:bg-primary-700"
        >
          Create Quiz
        </Link>
      </div>

      {quizzes.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No published quizzes yet.{' '}
          <Link to="/admin/create" className="text-primary-600 hover:underline">
            Create one
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Category
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Questions
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Visibility
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Time
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Shuffle
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {quizzes.map((quiz) => (
                <tr key={quiz.jobId} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link
                      to={`/admin/quizzes/${quiz.jobId}`}
                      className="font-medium text-gray-900 hover:text-primary-600"
                    >
                      {formatTitle(quiz.fileName)}
                    </Link>
                    {quiz.description && (
                      <p className="text-sm text-gray-500 truncate max-w-xs">{quiz.description}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {quiz.category || 'Laws of the Game'}
                  </td>
                  <td className="px-6 py-4 text-center text-sm font-medium">
                    {quiz.approvedCount}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => toggleVisibility(quiz)}
                      disabled={toggling === quiz.jobId}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors disabled:opacity-50 ${
                        quiz.isPublic
                          ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {quiz.isPublic ? '🌐 Public' : '🔒 Private'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600">
                    {quiz.timeLimitMinutes ? `${quiz.timeLimitMinutes}m` : '—'}
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600">
                    {quiz.shuffleOptions !== false ? '✓' : '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/admin/quizzes/${quiz.jobId}`}
                        className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Manage
                      </Link>
                      <Link
                        to={`/admin/quizzes/${quiz.jobId}/edit`}
                        className="text-sm text-gray-600 hover:text-gray-800 font-medium"
                      >
                        Edit
                      </Link>
                      <a
                        href={`/quiz/${quiz.jobId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gray-400 hover:text-gray-600"
                        title="View quiz"
                      >
                        ↗
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
