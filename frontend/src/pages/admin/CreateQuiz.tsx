import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createManualJob, getQuestionBank, addManualQuestion } from '../../api/client';
import { useAccessToken } from '../../hooks/useAccessToken';
import type { Law, BankQuestion } from '../../types';

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

export default function CreateQuiz() {
  const navigate = useNavigate();
  const { getToken } = useAccessToken();

  // Step 1: quiz metadata
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Laws of the Game');
  const [timeLimit, setTimeLimit] = useState('');
  const [lawFilter, setLawFilter] = useState<'' | Law>('');
  const [questionsPerAttempt, setQuestionsPerAttempt] = useState('');
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 2: question picker
  const [jobId, setJobId] = useState<string | null>(null);
  const [bankQuestions, setBankQuestions] = useState<BankQuestion[]>([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lawPickerFilter, setLawPickerFilter] = useState<'' | Law>('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Load approved questions from bank once quiz is created
  useEffect(() => {
    if (!jobId) return;
    setBankLoading(true);
    getToken()
      .then((token) =>
        getQuestionBank(token, {
          status: 'approved',
          limit: 200,
          law: lawPickerFilter || undefined,
        })
      )
      .then((res) => setBankQuestions(res.questions))
      .catch(() => setBankQuestions([]))
      .finally(() => setBankLoading(false));
  }, [jobId, lawPickerFilter, getToken]);

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
          shuffleOptions,
        },
        token
      );
      setJobId(response.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create quiz');
    } finally {
      setLoading(false);
    }
  };

  const toggleQuestion = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAddSelected = async () => {
    if (!jobId || selected.size === 0) return;
    setAdding(true);
    setAddError(null);
    try {
      const token = await getToken();
      const toAdd = bankQuestions.filter((q) => selected.has(q.questionId));
      await Promise.all(
        toAdd.map((q) =>
          addManualQuestion(
            jobId,
            {
              text: q.text,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              law: q.law,
              lawReference: q.lawReference,
              difficulty: q.difficulty,
              tags: q.tags,
            },
            token
          )
        )
      );
      navigate(`/admin/jobs/${jobId}`);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add questions');
    } finally {
      setAdding(false);
    }
  };

  // ── Step 2: question picker ──────────────────────────────────────────────
  if (jobId) {
    const filtered = lawPickerFilter
      ? bankQuestions.filter((q) => q.law === lawPickerFilter)
      : bankQuestions;

    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Add Questions to "{title}"</h1>
          <p className="text-gray-600 mt-1">
            Select approved questions from the bank, or skip to add them manually later.
          </p>
        </div>

        {addError && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{addError}</p>
          </div>
        )}

        <div className="mb-4 flex items-center gap-4 flex-wrap">
          <select
            value={lawPickerFilter}
            onChange={(e) => setLawPickerFilter(e.target.value as '' | Law)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Laws</option>
            {LAWS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-500">
            {selected.size} selected · {filtered.length} available
          </span>
        </div>

        <div className="bg-white rounded-lg shadow divide-y divide-gray-200 mb-6 max-h-[60vh] overflow-y-auto">
          {bankLoading ? (
            <div className="p-8 text-center text-gray-500">Loading questions...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No approved questions found{lawPickerFilter ? ` for ${lawPickerFilter}` : ''}.
            </div>
          ) : (
            filtered.map((q) => (
              <label
                key={q.questionId}
                className={`flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 ${
                  selected.has(q.questionId) ? 'bg-primary-50' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(q.questionId)}
                  onChange={() => toggleQuestion(q.questionId)}
                  className="mt-1 w-4 h-4 text-primary-600 rounded"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-medium px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                      {q.law}
                    </span>
                    {q.difficulty && (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                        {q.difficulty}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-900">{q.text}</p>
                </div>
              </label>
            ))
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleAddSelected}
            disabled={adding || selected.size === 0}
            className="btn-primary disabled:opacity-50"
          >
            {adding
              ? 'Adding...'
              : `Add ${selected.size} Question${selected.size !== 1 ? 's' : ''}`}
          </button>
          <button onClick={() => navigate(`/admin/jobs/${jobId}`)} className="btn-secondary">
            Skip — Add Manually Later
          </button>
        </div>
      </div>
    );
  }

  // ── Step 1: quiz metadata form ───────────────────────────────────────────
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
              <div className="sm:col-span-2">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shuffleOptions}
                    onChange={(e) => setShuffleOptions(e.target.checked)}
                    className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                    disabled={loading}
                  />
                  <span className="text-sm font-medium text-gray-700">Shuffle answer options</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  Randomise the order of answer options on each attempt. Disable for quizzes where
                  option order matters.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
              {loading ? 'Creating...' : 'Create Quiz & Pick Questions'}
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
