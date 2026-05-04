import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { getQuiz, getQuestions } from '../api/client';
import type { QuizDetail, Question, Answer } from '../types';

const OPTION_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function QuizTake() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const {
    isAuthenticated,
    loginWithRedirect,
    isLoading: authLoading,
    getIdTokenClaims,
  } = useAuth0();

  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [requiresAuth, setRequiresAuth] = useState(false);

  const answersRef = useRef<Answer[]>([]);
  const questionsRef = useRef<Question[]>([]);
  const submittedRef = useRef(false);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  useEffect(() => {
    async function loadQuiz() {
      if (!quizId || authLoading) return;

      try {
        const quizData = await getQuiz(quizId);

        if (!quizData.isPublic && !isAuthenticated) {
          setQuiz(quizData);
          setRequiresAuth(true);
          setLoading(false);
          return;
        }

        let token: string | undefined;
        if (isAuthenticated) {
          const claims = await getIdTokenClaims();
          token = claims?.__raw;
        }
        const questionsData = await getQuestions(quizId, undefined, token);
        setQuiz(quizData);
        setQuestions(questionsData);
        sessionStorage.setItem('quizStartedAt', Date.now().toString());
        if (quizData.timeLimitMinutes && quizData.timeLimitMinutes > 0) {
          setSecondsLeft(quizData.timeLimitMinutes * 60);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load quiz');
      } finally {
        setLoading(false);
      }
    }

    loadQuiz();
  }, [quizId, isAuthenticated, authLoading]);

  const submit = useCallback(
    (auto: boolean) => {
      if (!quizId || submittedRef.current) return;
      submittedRef.current = true;

      // Pad unanswered with -1 so the backend's score divisor stays correct
      const finalAnswers: Answer[] = questionsRef.current.map((q) => {
        const existing = answersRef.current.find((a) => a.questionId === q.questionId);
        return existing ?? { questionId: q.questionId, selectedOption: -1 };
      });

      sessionStorage.setItem('quizAnswers', JSON.stringify(finalAnswers));
      sessionStorage.setItem('quizQuestions', JSON.stringify(questionsRef.current));
      sessionStorage.setItem('quizAutoSubmitted', auto ? 'true' : 'false');

      navigate(`/quiz/${quizId}/results`);
    },
    [quizId, navigate]
  );

  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      submit(true);
      return;
    }
    const id = window.setTimeout(() => setSecondsLeft((s) => (s === null ? s : s - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [secondsLeft, submit]);

  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers.find((a) => a.questionId === currentQuestion?.questionId);

  const handleSelectOption = useCallback(
    (optionIndex: number) => {
      if (!currentQuestion) return;

      setAnswers((prev) => {
        const existing = prev.find((a) => a.questionId === currentQuestion.questionId);
        if (existing) {
          return prev.map((a) =>
            a.questionId === currentQuestion.questionId ? { ...a, selectedOption: optionIndex } : a
          );
        }
        return [...prev, { questionId: currentQuestion.questionId, selectedOption: optionIndex }];
      });
    },
    [currentQuestion]
  );

  const handleNext = useCallback(() => {
    setCurrentIndex((i) => (i < questions.length - 1 ? i + 1 : i));
  }, [questions.length]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((i) => (i > 0 ? i - 1 : i));
  }, []);

  const handleSubmit = useCallback(() => submit(false), [submit]);

  const isLast = currentIndex === questions.length - 1;
  const answeredCount = answers.filter((a) => a.selectedOption >= 0).length;
  const canSubmit = answeredCount === questions.length && questions.length > 0;
  const lowTime = secondsLeft !== null && secondsLeft <= 60;

  useEffect(() => {
    if (loading || error || !currentQuestion) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.isContentEditable) return;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key >= 'a' && e.key <= 'z') {
        const idx = e.key.charCodeAt(0) - 97; // a=0, b=1, c=2, d=3
        if (idx < currentQuestion.options.length) {
          e.preventDefault();
          handleSelectOption(idx);
        }
        return;
      }

      if (e.key === 'ArrowRight') {
        if (!isLast) {
          e.preventDefault();
          handleNext();
        }
        return;
      }

      if (e.key === 'ArrowLeft') {
        if (currentIndex > 0) {
          e.preventDefault();
          handlePrevious();
        }
        return;
      }

      if (e.key === 'Enter') {
        if (isLast) {
          if (canSubmit) {
            e.preventDefault();
            handleSubmit();
          }
        } else {
          e.preventDefault();
          handleNext();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    loading,
    error,
    currentQuestion,
    currentIndex,
    isLast,
    canSubmit,
    handleSelectOption,
    handleNext,
    handlePrevious,
    handleSubmit,
  ]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (requiresAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="card max-w-md text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{quiz?.title || 'Quiz'}</h2>
          <p className="text-gray-600 mb-6">
            This quiz requires you to log in before you can take it.
          </p>
          <div className="flex gap-4 justify-center">
            <button onClick={() => loginWithRedirect()} className="btn-primary">
              Log In
            </button>
            <button onClick={() => navigate('/')} className="btn-secondary">
              Back to Quizzes
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error || !quiz || !currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="card max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-gray-600">{error || 'Quiz not found'}</p>
          <button onClick={() => navigate('/')} className="btn-primary mt-4">
            Back to Quizzes
          </button>
        </div>
      </div>
    );
  }

  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900">{quiz.title}</h1>
          <div className="flex items-center gap-4">
            {secondsLeft !== null && (
              <span
                className={`text-sm font-mono font-semibold px-3 py-1 rounded-full ${
                  lowTime ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                }`}
                aria-label="Time remaining"
              >
                {formatTime(Math.max(0, secondsLeft))}
              </span>
            )}
            <span className="text-sm text-gray-600">
              Question {currentIndex + 1} of {questions.length}
            </span>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      <div className="card mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">{currentQuestion.text}</h2>

        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleSelectOption(index)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                currentAnswer?.selectedOption === index
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-center">
                <div
                  className={`flex-shrink-0 w-6 h-6 rounded-full border-2 mr-3 flex items-center justify-center ${
                    currentAnswer?.selectedOption === index
                      ? 'border-primary-600 bg-primary-600'
                      : 'border-gray-300'
                  }`}
                >
                  {currentAnswer?.selectedOption === index && (
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <span
                  className="inline-flex items-center justify-center w-6 h-6 mr-3 text-xs font-mono font-semibold text-gray-500 bg-gray-100 rounded"
                  aria-hidden="true"
                >
                  {OPTION_LABELS[index]}
                </span>
                <span className="text-gray-900">{option}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button onClick={handlePrevious} disabled={currentIndex === 0} className="btn-secondary">
          ← Previous
        </button>

        <div className="text-sm text-gray-600">
          {answeredCount} of {questions.length} answered
        </div>

        {isLast ? (
          <button onClick={handleSubmit} disabled={!canSubmit} className="btn-primary">
            Submit Quiz
          </button>
        ) : (
          <button onClick={handleNext} className="btn-primary">
            Next →
          </button>
        )}
      </div>

      <p className="hidden sm:block text-center text-xs text-gray-400 mt-6">
        Shortcuts: <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded">A</kbd>
        –
        <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded">
          {OPTION_LABELS[currentQuestion.options.length - 1]}
        </kbd>{' '}
        select · <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded">←</kbd>/
        <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded">→</kbd> nav ·{' '}
        <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded">Enter</kbd>{' '}
        {isLast ? 'submit' : 'next'}
      </p>
    </div>
  );
}
