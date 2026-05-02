import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { submitAnswers } from '../api/client';
import type { Answer, SubmitAnswersResponse } from '../types';

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function triggerConfetti(percentage: number) {
  if (prefersReducedMotion()) return;

  if (percentage >= 90) {
    const duration = 1200;
    const end = Date.now() + duration;
    const colors = ['#10b981', '#059669', '#047857', '#34d399'];

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  } else if (percentage >= 70) {
    // Medium celebration for 70-89%
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#3b82f6', '#2563eb', '#1d4ed8', '#60a5fa'],
    });
  }
  // No confetti for below 70%
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

export default function QuizResults() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();

  const [results, setResults] = useState<SubmitAnswersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [reviewWrongOnly, setReviewWrongOnly] = useState(false);
  const [autoSubmitted, setAutoSubmitted] = useState(false);

  useEffect(() => {
    async function loadResults() {
      const storedAnswers = sessionStorage.getItem('quizAnswers');

      if (!storedAnswers || !quizId) {
        navigate(`/quiz/${quizId}`);
        return;
      }

      const startedAtRaw = sessionStorage.getItem('quizStartedAt');
      const startedAt = startedAtRaw ? parseInt(startedAtRaw, 10) : NaN;
      if (Number.isFinite(startedAt) && startedAt > 0) {
        setDurationMs(Date.now() - startedAt);
      }

      setAutoSubmitted(sessionStorage.getItem('quizAutoSubmitted') === 'true');

      try {
        const answers: Answer[] = JSON.parse(storedAnswers);
        const response = await submitAnswers(quizId, answers);
        setResults(response);
        triggerConfetti(response.score.percentage);
      } catch (err) {
        console.error('Error submitting answers:', err);
        setError(err instanceof Error ? err.message : 'Failed to load results');
      } finally {
        setLoading(false);
      }
    }

    loadResults();
  }, [quizId, navigate]);

  const clearQuizSession = () => {
    sessionStorage.removeItem('quizQuestions');
    sessionStorage.removeItem('quizAnswers');
    sessionStorage.removeItem('quizStartedAt');
    sessionStorage.removeItem('quizAutoSubmitted');
  };

  const handleRetry = () => {
    clearQuizSession();
    navigate(`/quiz/${quizId}`);
  };

  const handleBackToQuizzes = () => {
    clearQuizSession();
    navigate('/');
  };

  const visibleResults = useMemo(() => {
    if (!results) return [];
    const indexed = results.results.map((r, i) => ({ result: r, originalIndex: i }));
    return reviewWrongOnly ? indexed.filter(({ result }) => !result.isCorrect) : indexed;
  }, [results, reviewWrongOnly]);

  const wrongCount = results
    ? results.results.length - results.score.correct
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Calculating results...</p>
        </div>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="card text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error || 'Failed to load results'}</p>
          <div className="flex gap-4 justify-center">
            <button onClick={handleRetry} className="btn-primary">
              Retry Quiz
            </button>
            <button onClick={handleBackToQuizzes} className="btn-secondary">
              Back to Quizzes
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { score } = results;

  const getMessage = () => {
    if (score.percentage >= 90) {
      return {
        text: 'Excellent work! You really know the Laws of the Game!',
        color: 'text-green-600',
      };
    } else if (score.percentage >= 70) {
      return { text: 'Good job! Keep studying to master the Laws!', color: 'text-blue-600' };
    } else {
      return { text: 'Keep practicing! Review the Laws and try again.', color: 'text-amber-600' };
    }
  };

  const message = getMessage();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="card mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Quiz Results</h1>
        {autoSubmitted && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg p-3 mb-4">
            Time ran out — your quiz was submitted automatically.
          </div>
        )}
        <p className={`text-lg font-medium mb-4 ${message.color}`}>{message.text}</p>
        <div className="flex items-center justify-center gap-8 mb-4 flex-wrap">
          <div>
            <div className="text-5xl font-bold text-primary-600">{score.percentage}%</div>
            <div className="text-gray-600 mt-1">Score</div>
          </div>
          <div>
            <div className="text-3xl font-semibold text-gray-900">
              {score.correct}/{score.total}
            </div>
            <div className="text-gray-600 mt-1">Correct Answers</div>
          </div>
          {durationMs !== null && (
            <div>
              <div className="text-3xl font-semibold text-gray-900">
                {formatDuration(durationMs)}
              </div>
              <div className="text-gray-600 mt-1">Time Taken</div>
            </div>
          )}
        </div>
        <div className="flex gap-4 justify-center mt-6">
          <button onClick={handleRetry} className="btn-primary">
            Retry Quiz
          </button>
          <button onClick={handleBackToQuizzes} className="btn-secondary">
            Back to Quizzes
          </button>
        </div>
      </div>

      {wrongCount > 0 && (
        <div className="flex items-center justify-end mb-4">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={reviewWrongOnly}
              onChange={(e) => setReviewWrongOnly(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            Review wrong answers only ({wrongCount})
          </label>
        </div>
      )}

      <div className="space-y-6">
        {visibleResults.map(({ result, originalIndex }) => (
          <div key={result.questionId} className="card">
            <div className="flex items-start gap-4">
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  result.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {result.isCorrect ? '✓' : '✗'}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-3">
                  {originalIndex + 1}. {result.text}
                </h3>

                <div className="space-y-2 mb-4">
                  {result.options.map((option, optionIndex) => {
                    const isCorrect = optionIndex === result.correctOption;
                    const isSelected = optionIndex === result.selectedOption;

                    return (
                      <div
                        key={optionIndex}
                        className={`p-3 rounded-lg border-2 ${
                          isCorrect
                            ? 'border-green-500 bg-green-50'
                            : isSelected
                              ? 'border-red-500 bg-red-50'
                              : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-gray-900">{option}</span>
                          {isCorrect && (
                            <span className="text-sm font-medium text-green-700">
                              Correct Answer
                            </span>
                          )}
                          {isSelected && !isCorrect && (
                            <span className="text-sm font-medium text-red-700">Your Answer</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {result.selectedOption < 0 && (
                    <p className="text-sm font-medium text-amber-700">Not answered</p>
                  )}
                </div>

                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                  <p className="text-sm font-semibold text-blue-900 mb-1">
                    Explanation ({result.lawReference})
                  </p>
                  <p className="text-sm text-blue-800">{result.explanation}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
