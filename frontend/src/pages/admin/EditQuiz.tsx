import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getExtractionJob, updateQuizMetadata } from '../../api/client';
import { useAccessToken } from '../../hooks/useAccessToken';
import type { ExtractionJob, Law } from '../../types';

const CATEGORIES = [
  'Laws of the Game',
  'Practical Refereeing',
  'Offside',
  'Fouls and Misconduct',
  'Set Pieces',
  'General Knowledge',
];

const LAWS: Law[] = [
  'Law 1',
  'Law 2',
  'Law 3',
  'Law 4',
  'Law 5',
  'Law 6',
  'Law 7',
  'Law 8',
  'Law 9',
  'Law 10',
  'Law 11',
  'Law 12',
  'Law 13',
  'Law 14',
  'Law 15',
  'Law 16',
  'Law 17',
];

function formatTitle(fileName: string): string {
  return fileName
    .replace(/\.pdf$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function EditQuiz() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { getToken } = useAccessToken();

  const [job, setJob] = useState<ExtractionJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Laws of the Game');
  const [timeLimit, setTimeLimit] = useState('');
  const [questionsPerAttempt, setQuestionsPerAttempt] = useState('');
  const [lawFilter, setLawFilter] = useState<'' | Law>('');
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    getToken()
      .then((token) => getExtractionJob(jobId, token))
      .then((data) => {
        setJob(data);
        setTitle(formatTitle(data.fileName));
        setDescription(data.description || '');
        setCategory(data.category || 'Laws of the Game');
        setTimeLimit(data.timeLimitMinutes?.toString() || '');
        setQuestionsPerAttempt(data.questionsPerAttempt?.toString() || '');
        setLawFilter((data.lawFilter as '' | Law) || '');
        setShuffleOptions(data.shuffleOptions !== false);
        setIsPublic(data.isPublic ?? false);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load quiz'))
      .finally(() => setLoading(false));
  }, [jobId, getToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobId || !title.trim()) {
      setError('Title is required');
      return;
    }

    let timeLimitNum: number | null = null;
    if (timeLimit.trim()) {
      const parsed = Number(timeLimit);
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 240) {
        setError('Time limit must be between 1 and 240');
        return;
      }
      timeLimitNum = parsed;
    }

    let questionsNum: number | null = null;
    if (questionsPerAttempt.trim()) {
      const parsed = Number(questionsPerAttempt);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 50) {
        setError('Questions per attempt must be 1-50');
        return;
      }
      questionsNum = parsed;
    }

    setSaving(true);
    setError(null);
    try {
      const token = await getToken();
      await updateQuizMetadata(
        jobId,
        {
          title: title.trim(),
          description: description.trim(),
          category,
          timeLimitMinutes: timeLimitNum,
          questionsPerAttempt: questionsNum,
          lawFilter: lawFilter || null,
          shuffleOptions,
          isPublic,
        },
        token
      );
      navigate('/admin/quizzes');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-700">{error || 'Quiz not found'}</p>
        <Link to="/admin/quizzes" className="mt-4 inline-block btn-secondary">
          Back
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <Link
          to="/admin/quizzes"
          className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block"
        >
          ← Back to Quizzes
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit Quiz</h1>
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
              Title *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={saving}
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
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={saving}
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
              disabled={saving}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="border-t pt-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Quiz Configuration</h2>
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
                  disabled={saving}
                />
              </div>
              <div>
                <label
                  htmlFor="questionsPerAttempt"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
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
                  disabled={saving}
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
                  disabled={saving}
                >
                  <option value="">All laws</option>
                  {LAWS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shuffleOptions}
                    onChange={(e) => setShuffleOptions(e.target.checked)}
                    className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                    disabled={saving}
                  />
                  <span className="text-sm font-medium text-gray-700">Shuffle answer options</span>
                </label>
              </div>
              <div>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                    disabled={saving}
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Public (no login required)
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <Link to="/admin/quizzes" className="btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
