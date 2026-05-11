import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useAccessToken } from '../hooks/useAccessToken';
import { getBookmarks, removeBookmark } from '../api/client';
import LawDrawer from '../components/LawDrawer';
import type { BookmarkedQuestion } from '../types';

const OPTION_LABELS = 'ABCD';

export default function BookmarksPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, loginWithRedirect } = useAuth0();
  const { getToken } = useAccessToken();

  const [questions, setQuestions] = useState<BookmarkedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Set<string>>(new Set());
  const [lawDrawerRef, setLawDrawerRef] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) loginWithRedirect();
  }, [authLoading, isAuthenticated, loginWithRedirect]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const data = await getBookmarks(token!);
        if (!cancelled) setQuestions(data.questions);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load bookmarks');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, getToken]);

  async function handleRemove(questionId: string) {
    setRemoving((prev) => new Set(prev).add(questionId));
    try {
      const token = await getToken();
      await removeBookmark(questionId, token!);
      setQuestions((prev) => prev.filter((q) => q.questionId !== questionId));
    } catch {
      // silently ignore — item stays in list
    } finally {
      setRemoving((prev) => {
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      });
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="card max-w-md text-center">
          <p className="text-red-600 font-medium mb-4">{error}</p>
          <button onClick={() => navigate('/')} className="btn-secondary">Back to Quizzes</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Bookmarks</h1>
        <button onClick={() => navigate('/profile')} className="btn-secondary text-sm">
          ← Back
        </button>
      </div>

      {questions.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">🔖</div>
          <p className="text-gray-600 mb-4">No bookmarks yet.</p>
          <p className="text-sm text-gray-400 mb-6">
            Bookmark questions during quizzes or practice sessions to review them here.
          </p>
          <button onClick={() => navigate('/')} className="btn-primary">Browse Quizzes</button>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">{questions.length} saved question{questions.length !== 1 ? 's' : ''}</p>
          <div className="space-y-4">
            {questions.map((q) => (
              <div key={q.questionId} className="card border-l-4 border-blue-400">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs text-gray-400">{q.lawReference}</p>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <button
                      onClick={() => setLawDrawerRef(q.lawReference)}
                      className="text-xs text-blue-600 underline underline-offset-2 hover:text-blue-800"
                    >
                      View Law →
                    </button>
                    <button
                      onClick={() => handleRemove(q.questionId)}
                      disabled={removing.has(q.questionId)}
                      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40"
                    >
                      {removing.has(q.questionId) ? '…' : '✕ Remove'}
                    </button>
                  </div>
                </div>

                <p className="text-gray-900 font-medium mb-3 text-sm">{q.text}</p>

                <div className="space-y-1 mb-3">
                  {q.options.map((opt, i) => {
                    const isCorrect = q.correctAnswer === i;
                    return (
                      <div
                        key={i}
                        className={`text-xs px-3 py-1.5 rounded border ${
                          isCorrect
                            ? 'bg-green-50 border-green-400 text-green-800 font-medium'
                            : 'bg-gray-50 border-gray-200 text-gray-600'
                        }`}
                      >
                        {OPTION_LABELS[i]}. {opt}
                        {isCorrect && ' ✓'}
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs text-blue-700 bg-blue-50 p-2 rounded">{q.explanation}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {lawDrawerRef && (
        <LawDrawer lawReference={lawDrawerRef} onClose={() => setLawDrawerRef(null)} />
      )}
    </div>
  );
}
