import { useCallback, useEffect, useState } from 'react';
import { listConflicts, resolveConflict } from '../../api/client';
import { useAccessToken } from '../../hooks/useAccessToken';
import type { ConflictResolution, ConflictStatus, QuestionConflict } from '../../types';

const LETTERS = ['A', 'B', 'C', 'D'];

export default function AdminConflicts() {
  const { getToken } = useAccessToken();
  const [conflicts, setConflicts] = useState<QuestionConflict[]>([]);
  const [statusFilter, setStatusFilter] = useState<ConflictStatus>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await listConflicts(token, statusFilter);
      setConflicts(res.conflicts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conflicts');
    } finally {
      setLoading(false);
    }
  }, [getToken, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleResolve = async (conflictId: string, resolution: ConflictResolution) => {
    setResolvingId(conflictId);
    try {
      const token = await getToken();
      await resolveConflict(conflictId, resolution, token);
      setConflicts((prev) => prev.filter((c) => c.conflictId !== conflictId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to resolve conflict');
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Conflicts</h1>
          <p className="text-gray-600">
            Questions extracted from a new PDF that match an existing question by text and
            options, but with a different answer or explanation. Often caused by IFAB law
            updates changing the right answer to a familiar scenario.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(['pending', 'resolved'] as ConflictStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {s === 'pending' ? 'Pending' : 'Resolved'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-700">{error}</p>
        </div>
      ) : conflicts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-lg text-gray-600">
            {statusFilter === 'pending' ? 'No pending conflicts' : 'No resolved conflicts yet'}
          </p>
          {statusFilter === 'pending' && (
            <p className="text-sm text-gray-500 mt-2">
              Conflicts will appear here automatically when a PDF import contains a question
              whose answer differs from the existing version.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {conflicts.map((conflict) => (
            <ConflictCard
              key={conflict.conflictId}
              conflict={conflict}
              resolving={resolvingId === conflict.conflictId}
              onResolve={(r) => handleResolve(conflict.conflictId, r)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ConflictCard({
  conflict,
  resolving,
  onResolve,
}: {
  conflict: QuestionConflict;
  resolving: boolean;
  onResolve: (resolution: ConflictResolution) => void;
}) {
  const isResolved = conflict.status === 'resolved';
  return (
    <div className="bg-white rounded-lg shadow border border-amber-200">
      <div className="px-6 py-4 border-b border-gray-200 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 line-clamp-2">{conflict.text}</p>
          <p className="text-xs text-gray-500 mt-1">
            From job {conflict.jobId} · {new Date(conflict.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {conflict.diffFields.map((f) => (
            <span
              key={f}
              className="px-2 py-0.5 text-xs font-medium rounded bg-amber-100 text-amber-800"
            >
              {f} differs
            </span>
          ))}
        </div>
      </div>

      <div className="px-6 py-4 grid gap-4 md:grid-cols-2">
        <SidePanel
          title="Existing question"
          subtitle="Currently in the bank"
          tone="gray"
          options={conflict.options}
          correctIndex={conflict.existing.correctAnswer}
          law={conflict.existing.law}
          lawReference={conflict.existing.lawReference}
          explanation={conflict.existing.explanation}
        />
        <SidePanel
          title="New candidate"
          subtitle={`From the PDF import (${Math.round(conflict.candidate.confidence * 100)}% confidence)`}
          tone="amber"
          options={conflict.options}
          correctIndex={conflict.candidate.correctAnswer}
          law={conflict.candidate.law}
          lawReference={conflict.candidate.lawReference}
          explanation={conflict.candidate.explanation}
          highlight={conflict.diffFields}
          compareTo={conflict.existing}
        />
      </div>

      {!isResolved && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2 flex-wrap">
          <button
            onClick={() => onResolve('kept_existing')}
            disabled={resolving}
            className="btn-secondary text-sm disabled:opacity-50"
          >
            Keep existing
          </button>
          <button
            onClick={() => onResolve('kept_both')}
            disabled={resolving}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
          >
            Keep both
          </button>
          <button
            onClick={() => onResolve('replaced')}
            disabled={resolving}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {resolving ? 'Saving…' : 'Replace with new'}
          </button>
        </div>
      )}

      {isResolved && conflict.resolution && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
          Resolved as <span className="font-medium">{labelForResolution(conflict.resolution)}</span>
          {conflict.resolvedBy && ` by ${conflict.resolvedBy}`}
          {conflict.resolvedAt && ` on ${new Date(conflict.resolvedAt).toLocaleString()}`}
        </div>
      )}
    </div>
  );
}

function SidePanel({
  title,
  subtitle,
  tone,
  options,
  correctIndex,
  law,
  lawReference,
  explanation,
  highlight,
  compareTo,
}: {
  title: string;
  subtitle: string;
  tone: 'gray' | 'amber';
  options: string[];
  correctIndex: number;
  law: string;
  lawReference: string;
  explanation: string;
  highlight?: QuestionConflict['diffFields'];
  compareTo?: QuestionConflict['existing'];
}) {
  const headerTone = tone === 'amber' ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200';
  const diffMarks = new Set(highlight ?? []);

  return (
    <div className={`rounded-lg border ${headerTone} p-4`}>
      <div className="mb-3">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
      <ul className="space-y-1.5 mb-3">
        {options.map((opt, i) => {
          const isCorrect = i === correctIndex;
          const flipped =
            compareTo && diffMarks.has('correctAnswer') && i === compareTo.correctAnswer && !isCorrect;
          return (
            <li
              key={i}
              className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm ${
                isCorrect
                  ? 'bg-green-100 text-green-900 border border-green-200'
                  : flipped
                    ? 'bg-red-50 text-red-700 border border-red-200 line-through opacity-70'
                    : 'bg-white text-gray-700 border border-gray-200'
              }`}
            >
              <span className="text-xs font-mono w-4 flex-shrink-0">{LETTERS[i]}</span>
              <span className="flex-1">{opt}</span>
              {isCorrect && <span className="text-green-600 text-xs font-bold">✓</span>}
            </li>
          );
        })}
      </ul>
      <div className="space-y-1 text-xs">
        <p className={diffMarks.has('law') ? 'text-amber-700 font-medium' : 'text-gray-500'}>
          Law: {law}
        </p>
        <p
          className={diffMarks.has('lawReference') ? 'text-amber-700 font-medium' : 'text-gray-500'}
        >
          Ref: {lawReference || '—'}
        </p>
      </div>
      {explanation && (
        <p
          className={`mt-2 text-xs ${
            diffMarks.has('explanation') ? 'text-amber-700' : 'text-gray-600'
          }`}
        >
          <span className="font-medium">Explanation:</span> {explanation}
        </p>
      )}
    </div>
  );
}

function labelForResolution(r: ConflictResolution): string {
  switch (r) {
    case 'kept_existing':
      return 'kept existing';
    case 'replaced':
      return 'replaced with new candidate';
    case 'kept_both':
      return 'kept both';
  }
}
