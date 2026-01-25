import { useEffect, useState, useCallback } from 'react';
import { getQuestionBank, reviewQuestion, bulkReviewQuestions } from '../../api/client';
import { useAccessToken } from '../../hooks/useAccessToken';
import type { BankQuestion, QuestionStatus } from '../../types';

export default function AdminReview() {
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [bulkReviewing, setBulkReviewing] = useState(false);
  const { getToken } = useAccessToken();

  const loadQuestions = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await getQuestionBank(token, { status: 'pending_review', limit: 100 });
      // Sort by confidence (lowest first)
      const sorted = [...res.questions].sort((a, b) => a.confidence - b.confidence);
      setQuestions(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const handleReview = async (questionId: string, status: QuestionStatus) => {
    setReviewing(questionId);
    try {
      const token = await getToken();
      await reviewQuestion(questionId, status, token);
      setQuestions((prev) => prev.filter((q) => q.questionId !== questionId));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      });
    } catch (err) {
      console.error('Review failed:', err);
    } finally {
      setReviewing(null);
    }
  };

  const handleBulkReview = async (status: QuestionStatus) => {
    if (selectedIds.size === 0) return;

    setBulkReviewing(true);
    try {
      const token = await getToken();
      await bulkReviewQuestions(Array.from(selectedIds), status, token);
      setQuestions((prev) => prev.filter((q) => !selectedIds.has(q.questionId)));
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Bulk review failed:', err);
    } finally {
      setBulkReviewing(false);
    }
  };

  const toggleSelect = (questionId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === questions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(questions.map((q) => q.questionId)));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-gray-600">Loading review queue...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Review Queue</h1>
        <p className="text-gray-600">
          {questions.length} question{questions.length !== 1 && 's'} pending review (sorted by
          confidence, lowest first)
        </p>
      </div>

      {questions.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.size === questions.length && questions.length > 0}
                onChange={selectAll}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Select all ({questions.length})</span>
            </label>
            {selectedIds.size > 0 && (
              <span className="text-sm text-gray-500">{selectedIds.size} selected</span>
            )}
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkReview('approved')}
                disabled={bulkReviewing}
                className="px-4 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 disabled:opacity-50"
              >
                {bulkReviewing ? 'Processing...' : `Approve ${selectedIds.size}`}
              </button>
              <button
                onClick={() => handleBulkReview('rejected')}
                disabled={bulkReviewing}
                className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 disabled:opacity-50"
              >
                {bulkReviewing ? 'Processing...' : `Reject ${selectedIds.size}`}
              </button>
            </div>
          )}
        </div>
      )}

      {questions.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <svg
            className="w-12 h-12 mx-auto text-green-500 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-lg text-gray-600">All caught up!</p>
          <p className="text-sm text-gray-500 mt-2">No questions pending review</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((question) => (
            <QuestionCard
              key={question.questionId}
              question={question}
              selected={selectedIds.has(question.questionId)}
              onToggleSelect={() => toggleSelect(question.questionId)}
              onReview={handleReview}
              reviewing={reviewing === question.questionId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionCard({
  question,
  selected,
  onToggleSelect,
  onReview,
  reviewing,
}: {
  question: BankQuestion;
  selected: boolean;
  onToggleSelect: () => void;
  onReview: (id: string, status: QuestionStatus) => void;
  reviewing: boolean;
}) {
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${selected ? 'ring-2 ring-primary-500' : ''}`}>
      <div className="flex items-start gap-4">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
              {question.law}
            </span>
            <ConfidenceBadge confidence={question.confidence} />
            <span className="text-xs text-gray-500">{question.lawReference}</span>
          </div>
          <p className="text-gray-900 text-lg mb-4">{question.text}</p>
          <div className="grid gap-2 mb-4">
            {question.options.map((option, index) => (
              <div
                key={index}
                className={`p-3 rounded ${
                  index === question.correctAnswer
                    ? 'bg-green-50 border border-green-200 text-green-800'
                    : 'bg-gray-50 text-gray-700'
                }`}
              >
                <span className="font-medium mr-2">{String.fromCharCode(65 + index)}.</span>
                {option}
                {index === question.correctAnswer && (
                  <span className="ml-2 text-green-600 font-medium">✓ Correct</span>
                )}
              </div>
            ))}
          </div>
          {question.explanation && (
            <div className="p-3 bg-blue-50 rounded text-sm text-blue-800">
              <span className="font-medium">Explanation:</span> {question.explanation}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => onReview(question.questionId, 'approved')}
            disabled={reviewing}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {reviewing ? '...' : 'Approve'}
          </button>
          <button
            onClick={() => onReview(question.questionId, 'rejected')}
            disabled={reviewing}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {reviewing ? '...' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percent = Math.round(confidence * 100);
  let bgColor = 'bg-red-100 text-red-700';
  if (confidence >= 0.95) bgColor = 'bg-green-100 text-green-700';
  else if (confidence >= 0.7) bgColor = 'bg-yellow-100 text-yellow-700';

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded ${bgColor}`}>
      {percent}% confidence
    </span>
  );
}
