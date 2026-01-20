import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getExtractionJob, reviewQuestion, publishQuiz } from '../../api/client';
import type { JobDetailResponse, BankQuestion, QuestionStatus, Difficulty } from '../../types';

export default function AdminJobDetail() {
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<JobDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    async function loadJob() {
      if (!jobId) return;

      try {
        const data = await getExtractionJob(jobId);
        setJob(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load job');
      } finally {
        setLoading(false);
      }
    }

    loadJob();
  }, [jobId]);

  const handlePublish = async () => {
    if (!jobId || !job) return;

    setPublishing(true);
    try {
      const newPublishedState = !job.published;
      await publishQuiz(jobId, newPublishedState);
      setJob({ ...job, published: newPublishedState });
    } catch (err) {
      console.error('Publish failed:', err);
      alert(err instanceof Error ? err.message : 'Failed to update publish status');
    } finally {
      setPublishing(false);
    }
  };

  const handleReview = async (questionId: string, status: QuestionStatus) => {
    setReviewing(questionId);
    try {
      await reviewQuestion(questionId, status);
      // Update local state
      if (job) {
        setJob({
          ...job,
          questions: job.questions.map((q) =>
            q.questionId === questionId ? { ...q, status } : q
          ),
          approvedCount:
            status === 'approved'
              ? job.approvedCount + 1
              : job.approvedCount - (job.questions.find((q) => q.questionId === questionId)?.status === 'approved' ? 1 : 0),
          pendingCount:
            status === 'pending_review'
              ? job.pendingCount + 1
              : job.pendingCount - (job.questions.find((q) => q.questionId === questionId)?.status === 'pending_review' ? 1 : 0),
          rejectedCount:
            status === 'rejected'
              ? job.rejectedCount + 1
              : job.rejectedCount - (job.questions.find((q) => q.questionId === questionId)?.status === 'rejected' ? 1 : 0),
        });
      }
    } catch (err) {
      console.error('Review failed:', err);
    } finally {
      setReviewing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-gray-600">Loading job...</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-700">{error || 'Job not found'}</p>
        <Link to="/admin/jobs" className="mt-4 inline-block btn-secondary">
          Back to Jobs
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <Link
          to="/admin/jobs"
          className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block"
        >
          ← Back to Jobs
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{job.fileName}</h1>
              <SourceBadge source={job.source} />
            </div>
            <p className="text-gray-500">Job ID: {job.jobId}</p>
            {job.description && (
              <p className="text-gray-600 mt-1">{job.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={job.status} />
            {job.source === 'manual_entry' && (
              <Link
                to={`/admin/jobs/${job.jobId}/add`}
                className="px-4 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700"
              >
                Add Question
              </Link>
            )}
            {job.status === 'completed' && job.approvedCount > 0 && (
              <button
                onClick={handlePublish}
                disabled={publishing}
                className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                  job.published
                    ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {publishing
                  ? 'Updating...'
                  : job.published
                    ? 'Unpublish Quiz'
                    : 'Publish Quiz'}
              </button>
            )}
            {job.published && (
              <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800">
                Published
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Total</div>
          <div className="text-2xl font-bold text-gray-900">{job.totalQuestions}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Approved</div>
          <div className="text-2xl font-bold text-green-600">{job.approvedCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Pending</div>
          <div className="text-2xl font-bold text-yellow-600">{job.pendingCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Rejected</div>
          <div className="text-2xl font-bold text-red-600">{job.rejectedCount}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Duplicates</div>
          <div className="text-2xl font-bold text-gray-600">{job.duplicateCount}</div>
        </div>
      </div>

      {job.errorMessage && (
        <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">Error: {job.errorMessage}</p>
        </div>
      )}

      {/* Questions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Extracted Questions ({job.questions.length})
          </h2>
        </div>
        <div className="divide-y divide-gray-200">
          {job.questions.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No questions extracted from this PDF
            </div>
          ) : (
            job.questions.map((question) => (
              <QuestionCard
                key={question.questionId}
                question={question}
                onReview={handleReview}
                reviewing={reviewing === question.questionId}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  onReview,
  reviewing,
}: {
  question: BankQuestion;
  onReview: (id: string, status: QuestionStatus) => void;
  reviewing: boolean;
}) {
  return (
    <div className="px-6 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center flex-wrap gap-2 mb-2">
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
              {question.law}
            </span>
            <ConfidenceBadge confidence={question.confidence} />
            <QuestionStatusBadge status={question.status} />
            {question.source && (
              <SourceBadge source={question.source} />
            )}
            {question.difficulty && (
              <DifficultyBadge difficulty={question.difficulty} />
            )}
          </div>
          <p className="text-gray-900 mb-3">{question.text}</p>
          <div className="grid gap-2">
            {question.options.map((option, index) => (
              <div
                key={index}
                className={`p-2 rounded text-sm ${
                  index === question.correctAnswer
                    ? 'bg-green-50 border border-green-200 text-green-800'
                    : 'bg-gray-50 text-gray-700'
                }`}
              >
                <span className="font-medium mr-2">
                  {String.fromCharCode(65 + index)}.
                </span>
                {option}
                {index === question.correctAnswer && (
                  <span className="ml-2 text-green-600">✓</span>
                )}
              </div>
            ))}
          </div>
          {question.explanation && (
            <p className="mt-3 text-sm text-gray-600">
              <span className="font-medium">Explanation:</span> {question.explanation}
            </p>
          )}
          {question.tags && question.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {question.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {question.status !== 'approved' && (
            <button
              onClick={() => onReview(question.questionId, 'approved')}
              disabled={reviewing}
              className="px-3 py-1 text-sm font-medium text-green-700 bg-green-100 rounded hover:bg-green-200 disabled:opacity-50"
            >
              Approve
            </button>
          )}
          {question.status !== 'rejected' && (
            <button
              onClick={() => onReview(question.questionId, 'rejected')}
              disabled={reviewing}
              className="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 rounded hover:bg-red-200 disabled:opacity-50"
            >
              Reject
            </button>
          )}
        </div>
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
      className={`px-3 py-1 text-sm font-medium rounded-full ${
        styles[status as keyof typeof styles] || styles.pending
      }`}
    >
      {status}
    </span>
  );
}

function QuestionStatusBadge({ status }: { status: QuestionStatus }) {
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

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded ${bgColor}`}>
      {percent}%
    </span>
  );
}

function SourceBadge({ source }: { source?: string }) {
  if (!source || source === 'pdf_extraction') {
    return (
      <span className="px-2 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-700">
        PDF
      </span>
    );
  }

  if (source === 'manual_entry') {
    return (
      <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-700">
        Manual
      </span>
    );
  }

  return (
    <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700">
      {source}
    </span>
  );
}

function DifficultyBadge({ difficulty }: { difficulty?: Difficulty }) {
  if (!difficulty) return null;

  const styles = {
    easy: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    hard: 'bg-red-100 text-red-700',
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded ${styles[difficulty]}`}>
      {difficulty}
    </span>
  );
}
