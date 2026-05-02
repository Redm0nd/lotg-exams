import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createManualJob } from '../../api/client';
import { useAccessToken } from '../../hooks/useAccessToken';
import type { Law } from '../../types';

const CATEGORIES = [
  'Laws of the Game',
  'Practical Refereeing',
  'Offside',
  'Fouls and Misconduct',
  'Set Pieces',
  'General Knowledge',
];

const LAWS: Law[] = [
  'Law 1', 'Law 2', 'Law 3', 'Law 4', 'Law 5', 'Law 6', 'Law 7', 'Law 8',
  'Law 9', 'Law 10', 'Law 11', 'Law 12', 'Law 13', 'Law 14', 'Law 15',
  'Law 16', 'Law 17',
];

export default function CreateQuiz() {
  const navigate = useNavigate();
  const { getToken } = useAccessToken();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Laws of the Game');
  const [timeLimit, setTimeLimit] = useState('');
  const [lawFilter, setLawFilter] = useState<'' | Law>('');
  const [questionsPerAttempt, setQuestionsPerAttempt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    let timeLimitMinutes: number | undefined;
    if (timeLimit.trim()) {
      const parsed = Number(timeLimit);
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 240) {
        setError('Time limit must be between 1 and 240 minutes');
        return;
      }
      timeLimitMinutes = parsed;
    }

    let questionsPerAttemptNum: number | undefined;
    if (questionsPerAttempt.trim()) {
      const parsed = Number(questionsPerAttempt);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 50) {
        setError('Questions per attempt must be a whole number between 1 and 50');
        return;
      }
      questionsPerAttemptNum = parsed;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const response = await createManualJob(
        {
          title: title.trim(),
          description: description.trim() || undefined,
          category,
          timeLimitMinutes,
          lawFilter: lawFilter || undefined,
          questionsPerAttempt: questionsPerAttemptNum,
        },
        token
      );

      // Navigate to the job detail page to add questions
      navigate(`/admin/jobs/${response.jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create quiz');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <Link to="/admin" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
          ← Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Create Manual Quiz</h1>
        <p className="text-gray-600">Create a new quiz and add questions manually</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Quiz Title *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Law 12 - Fouls and Misconduct"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of what this quiz covers..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={loading}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="border-t pt-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">
              Quiz Configuration <span className="font-normal text-gray-500">(optional)</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="timeLimit" className="block text-sm font-medium text-gray-700 mb-1">
                  Time Limit (minutes)
                </label>
                <input
                  type="number"
                  id="timeLimit"
                  min={1}
                  max={240}
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value)}
                  placeholder="No limit"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="questionsPerAttempt" className="block text-sm font-medium text-gray-700 mb-1">
                  Questions per Attempt
                </label>
                <input
                  type="number"
                  id="questionsPerAttempt"
                  min={1}
                  max={50}
                  value={questionsPerAttempt}
                  onChange={(e) => setQuestionsPerAttempt(e.target.value)}
                  placeholder="Default: 10"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="lawFilter" className="block text-sm font-medium text-gray-700 mb-1">
                  Restrict to a Single Law
                </label>
                <select
                  id="lawFilter"
                  value={lawFilter}
                  onChange={(e) => setLawFilter(e.target.value as '' | Law)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  disabled={loading}
                >
                  <option value="">All laws</option>
                  {LAWS.map((law) => (
                    <option key={law} value={law}>
                      {law}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
              {loading ? 'Creating...' : 'Create Quiz'}
            </button>
            <Link to="/admin" className="btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
