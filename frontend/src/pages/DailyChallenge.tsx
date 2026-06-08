import { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useAccessToken } from '../hooks/useAccessToken';
import { getDailyChallenge, submitDailyChallenge } from '../api/client';
import type { DailyChallengeResponse, DailyChallengeSubmitResponse } from '../api/client';

const OPTION_LABELS = 'ABCD';

type Phase = 'loading' | 'quiz' | 'results' | 'already-completed' | 'error';

export default function DailyChallengePage() {
  const { isAuthenticated, loginWithRedirect } = useAuth0();
  const { getToken } = useAccessToken();

  const [phase, setPhase] = useState<Phase>('loading');
  const [challenge, setChallenge] = useState<DailyChallengeResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitResult, setSubmitResult] = useState<DailyChallengeSubmitResponse | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;

    async function load() {
      try {
        const token = await getToken();
        const data = await getDailyChallenge(token);
        if (cancelled) return;
        setChallenge(data);
        setPhase(data.completed ? 'already-completed' : 'quiz');
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load');
        setPhase('error');
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, getToken]);

  async function handleSubmit() {
    if (!challenge) return;
    const unanswered = challenge.questions.filter((q) => answers[q.questionId] === undefined);
    if (unanswered.length > 0) return;

    setSubmitting(true);
    try {
      const token = await getToken();
      const result = await submitDailyChallenge(
        challenge.questions.map((q) => ({
          questionId: q.questionId,
          selectedOption: answers[q.questionId],
        })),
        token
      );
      setSubmitResult(result);
      setPhase('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed');
      setPhase('error');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Daily Challenge</h1>
        <p className="text-gray-600 mb-6">
          Log in to access your daily challenge and build your streak.
        </p>
        <button
          onClick={() => loginWithRedirect()}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
        >
          Log In
        </button>
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center">
        <div className="animate-pulse text-gray-500">Loading today's challenge...</div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="text-green-600 underline">
          Retry
        </button>
      </div>
    );
  }

  if (phase === 'already-completed' && challenge) {
    return (
      <div className="max-w-lg mx-auto mt-12 px-4">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">✅</div>
          <h1 className="text-2xl font-bold mb-2">Challenge Complete!</h1>
          <p className="text-gray-600">
            You scored{' '}
            <span className="font-semibold">
              {challenge.score}/{challenge.questions.length}
            </span>{' '}
            today.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 bg-orange-50 text-orange-700 px-4 py-2 rounded-full">
            <span className="text-xl">🔥</span>
            <span className="font-semibold">{challenge.streak} day streak</span>
          </div>
        </div>
        <p className="text-center text-gray-500 text-sm">Come back tomorrow for a new challenge!</p>
      </div>
    );
  }

  if (phase === 'results' && submitResult) {
    const { score, streak, results } = submitResult;
    return (
      <div className="max-w-2xl mx-auto mt-8 px-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Daily Challenge Results</h1>
          <p className="text-4xl font-bold text-green-600 mb-1">
            {score.correct}/{score.total}
          </p>
          <p className="text-gray-500">{score.percentage}%</p>
          <div className="mt-3 inline-flex items-center gap-2 bg-orange-50 text-orange-700 px-4 py-2 rounded-full">
            <span className="text-xl">🔥</span>
            <span className="font-semibold">{streak} day streak</span>
          </div>
        </div>
        <div className="space-y-4">
          {results.map((r) => (
            <div
              key={r.questionId}
              className={`p-4 rounded-lg border ${r.isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
            >
              <p className="font-medium mb-2">{r.text}</p>
              <div className="space-y-1 text-sm mb-2">
                {r.options.map((opt, i) => (
                  <div
                    key={i}
                    className={`px-2 py-1 rounded ${i === r.correctOption ? 'bg-green-200 font-medium' : i === r.selectedOption && !r.isCorrect ? 'bg-red-200' : ''}`}
                  >
                    {OPTION_LABELS[i]}. {opt}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-600">{r.explanation}</p>
              <p className="text-xs text-gray-400 mt-1">{r.lawReference}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Quiz phase
  if (!challenge) return null;
  const allAnswered = challenge.questions.every((q) => answers[q.questionId] !== undefined);

  return (
    <div className="max-w-2xl mx-auto mt-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Daily Challenge</h1>
        <div className="flex items-center gap-2 text-orange-600">
          <span>🔥</span>
          <span className="font-semibold">{challenge.streak} day streak</span>
        </div>
      </div>
      <p className="text-gray-500 text-sm mb-6">
        {challenge.date} • {challenge.questions.length} questions
      </p>

      <div className="space-y-6">
        {challenge.questions.map((q, qi) => (
          <div key={q.questionId} className="p-4 border rounded-lg">
            <p className="font-medium mb-3">
              {qi + 1}. {q.text}
            </p>
            <div className="space-y-2">
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => setAnswers((prev) => ({ ...prev, [q.questionId]: i }))}
                  className={`w-full text-left px-3 py-2 rounded border transition ${
                    answers[q.questionId] === i
                      ? 'border-green-600 bg-green-50 text-green-800'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {OPTION_LABELS[i]}. {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 mb-12 text-center">
        <button
          onClick={handleSubmit}
          disabled={!allAnswered || submitting}
          className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Submitting...' : 'Submit Challenge'}
        </button>
        {!allAnswered && (
          <p className="text-sm text-gray-400 mt-2">Answer all questions to submit</p>
        )}
      </div>
    </div>
  );
}
