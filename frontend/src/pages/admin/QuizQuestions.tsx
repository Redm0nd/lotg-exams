import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getExtractionJob,
  getQuestionBank,
  addManualQuestion,
  removeQuizQuestion,
} from '../../api/client';
import { useAccessToken } from '../../hooks/useAccessToken';
import type { JobDetailResponse, BankQuestion, Law } from '../../types';

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

export default function QuizQuestions() {
  const { jobId } = useParams<{ jobId: string }>();
  const { getToken } = useAccessToken();

  const [job, setJob] = useState<JobDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  // Question picker state
  const [showPicker, setShowPicker] = useState(false);
  const [bankQuestions, setBankQuestions] = useState<BankQuestion[]>([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lawPickerFilter, setLawPickerFilter] = useState<'' | Law>('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    getToken()
      .then((token) => getExtractionJob(jobId, token))
      .then(setJob)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [jobId, getToken]);

  const loadBank = async () => {
    setBankLoading(true);
    try {
      const token = await getToken();
      const res = await getQuestionBank(token, {
        status: 'approved',
        limit: 200,
        law: lawPickerFilter || undefined,
      });
      setBankQuestions(res.questions);
    } catch {
      setBankQuestions([]);
    } finally {
      setBankLoading(false);
    }
  };

  useEffect(() => {
    if (showPicker) loadBank();
  }, [showPicker, lawPickerFilter]);

  const handleRemove = async (questionId: string) => {
    if (!jobId || !confirm('Remove this question from the quiz?')) return;
    setRemoving(questionId);
    try {
      const token = await getToken();
      const res = await removeQuizQuestion(jobId, questionId, token);
      setJob((prev) =>
        prev
          ? {
              ...prev,
              approvedCount: res.approvedCount,
              questions: prev.questions.filter((q) => q.questionId !== questionId),
            }
          : prev
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove');
    } finally {
      setRemoving(null);
    }
  };

  const handleAddSelected = async () => {
    if (!jobId || selected.size === 0) return;
    setAdding(true);
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
      // Reload job data
      const data = await getExtractionJob(jobId, token);
      setJob(data);
      setSelected(new Set());
      setShowPicker(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add questions');
    } finally {
      setAdding(false);
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

  const approvedQuestions = job.questions.filter((q) => q.status === 'approved');
  const existingIds = new Set(job.questions.map((q) => q.questionId));
  const availableBank = bankQuestions.filter((q) => !existingIds.has(q.questionId));

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/admin/quizzes"
          className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block"
        >
          ← Back to Quizzes
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{formatTitle(job.fileName)}</h1>
            <p className="text-gray-600">
              {approvedQuestions.length} questions · {job.category || 'Laws of the Game'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPicker(!showPicker)}
              className="px-4 py-2 rounded-lg font-medium bg-primary-600 text-white hover:bg-primary-700"
            >
              {showPicker ? 'Cancel' : 'Add Questions'}
            </button>
            <Link to={`/admin/quizzes/${jobId}/edit`} className="btn-secondary">
              Edit Metadata
            </Link>
          </div>
        </div>
      </div>

      {/* Question Picker */}
      {showPicker && (
        <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Questions from Bank</h2>
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
              {selected.size} selected · {availableBank.length} available
            </span>
          </div>
          <div className="bg-white rounded-lg border divide-y divide-gray-200 max-h-[40vh] overflow-y-auto mb-4">
            {bankLoading ? (
              <div className="p-6 text-center text-gray-500">Loading...</div>
            ) : availableBank.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No available questions{lawPickerFilter ? ` for ${lawPickerFilter}` : ''}
              </div>
            ) : (
              availableBank.map((q) => (
                <label
                  key={q.questionId}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 ${selected.has(q.questionId) ? 'bg-primary-50' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(q.questionId)}
                    onChange={() =>
                      setSelected((prev) => {
                        const n = new Set(prev);
                        n.has(q.questionId) ? n.delete(q.questionId) : n.add(q.questionId);
                        return n;
                      })
                    }
                    className="mt-1 w-4 h-4 text-primary-600 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex gap-2 mb-1">
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
          <button
            onClick={handleAddSelected}
            disabled={adding || selected.size === 0}
            className="btn-primary disabled:opacity-50"
          >
            {adding
              ? 'Adding...'
              : `Add ${selected.size} Question${selected.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      )}

      {/* Current Questions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Questions ({approvedQuestions.length})
          </h2>
        </div>
        <div className="divide-y divide-gray-200">
          {approvedQuestions.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No questions in this quiz yet.
            </div>
          ) : (
            approvedQuestions.map((q, idx) => (
              <div key={q.questionId} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-400">{idx + 1}.</span>
                      <span className="text-xs font-medium px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                        {q.law}
                      </span>
                    </div>
                    <p className="text-gray-900 mb-2">{q.text}</p>
                    <div className="grid gap-1">
                      {q.options.map((opt, i) => (
                        <div
                          key={i}
                          className={`px-3 py-1.5 rounded text-sm ${i === q.correctAnswer ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-gray-50 text-gray-700'}`}
                        >
                          <span className="font-medium mr-2">{String.fromCharCode(65 + i)}.</span>
                          {opt}
                          {i === q.correctAnswer && <span className="ml-2 text-green-600">✓</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(q.questionId)}
                    disabled={removing === q.questionId}
                    className="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 rounded hover:bg-red-200 disabled:opacity-50 flex-shrink-0"
                  >
                    {removing === q.questionId ? '...' : 'Remove'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
