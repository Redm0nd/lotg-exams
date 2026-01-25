import { useEffect, useState, useCallback } from 'react';
import { getQuestionBank } from '../../api/client';
import { useAccessToken } from '../../hooks/useAccessToken';
import type { BankQuestion, Law, QuestionStatus } from '../../types';

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

const STATUSES: { value: QuestionStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'approved', label: 'Approved' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'rejected', label: 'Rejected' },
];

export default function AdminQuestionBank() {
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lawFilter, setLawFilter] = useState<Law | ''>('');
  const [statusFilter, setStatusFilter] = useState<QuestionStatus | ''>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { getToken } = useAccessToken();

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await getQuestionBank(token, {
        law: lawFilter || undefined,
        status: statusFilter || undefined,
        limit: 100,
      });
      setQuestions(res.questions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, [getToken, lawFilter, statusFilter]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const toggleExpand = (questionId: string) => {
    setExpandedId((prev) => (prev === questionId ? null : questionId));
  };

  // Group questions by law for stats
  const lawStats = questions.reduce<Record<string, number>>((acc, q) => {
    acc[q.law] = (acc[q.law] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Question Bank</h1>
        <p className="text-gray-600">Browse and filter all extracted questions</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Law</label>
            <select
              value={lawFilter}
              onChange={(e) => setLawFilter(e.target.value as Law | '')}
              className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="">All Laws</option>
              {LAWS.map((law) => (
                <option key={law} value={law}>
                  {law} ({lawStats[law] || 0})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as QuestionStatus | '')}
              className="block w-40 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              {STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1"></div>
          <div className="text-sm text-gray-500">
            Showing {questions.length} question{questions.length !== 1 && 's'}
          </div>
        </div>
      </div>

      {/* Law Quick Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setLawFilter('')}
          className={`px-3 py-1 text-sm rounded-full ${
            lawFilter === ''
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        {LAWS.map((law) => (
          <button
            key={law}
            onClick={() => setLawFilter(law)}
            className={`px-3 py-1 text-sm rounded-full ${
              lawFilter === law
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {law.replace('Law ', 'L')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-2 text-gray-600">Loading questions...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700">{error}</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-lg text-gray-600">No questions found</p>
          <p className="text-sm text-gray-500 mt-2">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Question
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Law
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                  Confidence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {questions.map((question) => (
                <QuestionRow
                  key={question.questionId}
                  question={question}
                  expanded={expandedId === question.questionId}
                  onToggle={() => toggleExpand(question.questionId)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function QuestionRow({
  question,
  expanded,
  onToggle,
}: {
  question: BankQuestion;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="hover:bg-gray-50 cursor-pointer" onClick={onToggle}>
        <td className="px-6 py-4">
          <p className="text-sm text-gray-900 line-clamp-2">{question.text}</p>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
            {question.law}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <ConfidenceBadge confidence={question.confidence} />
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <StatusBadge status={question.status} />
        </td>
      </tr>
      {expanded && (
        <tr className="bg-gray-50">
          <td colSpan={4} className="px-6 py-4">
            <div className="space-y-4">
              <div className="grid gap-2">
                {question.options.map((option, index) => (
                  <div
                    key={index}
                    className={`p-2 rounded text-sm ${
                      index === question.correctAnswer
                        ? 'bg-green-100 border border-green-200 text-green-800'
                        : 'bg-white border border-gray-200 text-gray-700'
                    }`}
                  >
                    <span className="font-medium mr-2">{String.fromCharCode(65 + index)}.</span>
                    {option}
                    {index === question.correctAnswer && (
                      <span className="ml-2 text-green-600 font-medium">✓</span>
                    )}
                  </div>
                ))}
              </div>
              {question.explanation && (
                <div className="p-3 bg-blue-50 rounded text-sm text-blue-800">
                  <span className="font-medium">Explanation:</span> {question.explanation}
                </div>
              )}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>Law Reference: {question.lawReference}</span>
                <span>|</span>
                <span>Job: {question.jobId}</span>
                <span>|</span>
                <span>Created: {new Date(question.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function StatusBadge({ status }: { status: QuestionStatus }) {
  const styles = {
    pending_review: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };

  const labels = {
    pending_review: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percent = Math.round(confidence * 100);
  let bgColor = 'bg-red-100 text-red-700';
  if (confidence >= 0.95) bgColor = 'bg-green-100 text-green-700';
  else if (confidence >= 0.7) bgColor = 'bg-yellow-100 text-yellow-700';

  return <span className={`px-2 py-0.5 text-xs font-medium rounded ${bgColor}`}>{percent}%</span>;
}
