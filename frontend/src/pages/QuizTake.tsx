import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { getQuiz, getQuestions } from '../api/client';
import type { QuizDetail, Question, StudyQuestion, Answer } from '../types';
import LawDrawer from '../components/LawDrawer';

const OPTION_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildShuffleMap(questions: Question[]): Record<string, number[]> {
  const map: Record<string, number[]> = {};
  for (const q of questions) {
    const indices = q.options.map((_, i) => i);
    map[q.questionId] = shuffleArray(indices);
  }
  return map;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

type QuizMode = 'exam' | 'study';

function isStudyQuestion(q: Question): q is StudyQuestion {
  return 'correctAnswer' in q;
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

  // Phase: 'select' (mode selection), 'quiz' (taking quiz), or 'auth' (login required)
  const [phase, setPhase] = useState<'loading' | 'select' | 'auth' | 'quiz' | 'error'>('loading');
  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [mode, setMode] = useState<QuizMode>('exam');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [shuffleMap, setShuffleMap] = useState<Record<string, number[]>>({});
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  // Study mode: whether current question feedback is revealed
  const [feedbackRevealed, setFeedbackRevealed] = useState(false);
  const [lawDrawerRef, setLawDrawerRef] = useState<string | null>(null);

  const answersRef = useRef<Answer[]>([]);
  const questionsRef = useRef<Question[]>([]);
  const submittedRef = useRef(false);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  // Load quiz metadata
  useEffect(() => {
    if (!quizId || authLoading) return;
    getQuiz(quizId)
      .then((data) => {
        setQuiz(data);
        if (!data.isPublic && !isAuthenticated) {
          setPhase('auth');
        } else {
          setPhase('select');
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load quiz');
        setPhase('error');
      });
  }, [quizId, isAuthenticated, authLoading]);

  // Start quiz with selected mode
  const startQuiz = useCallback(
    async (selectedMode: QuizMode) => {
      if (!quizId || !quiz) return;
      setMode(selectedMode);
      setPhase('loading');
      try {
        let token: string | undefined;
        if (isAuthenticated) {
          const claims = await getIdTokenClaims();
          token = claims?.__raw;
        }
        const data = await getQuestions(quizId, undefined, token, selectedMode);
        setQuestions(data);
        const shouldShuffle = quiz.shuffleOptions !== false;
        setShuffleMap(shouldShuffle ? buildShuffleMap(data) : {});
        sessionStorage.setItem('quizStartedAt', Date.now().toString());
        if (selectedMode === 'exam' && quiz.timeLimitMinutes && quiz.timeLimitMinutes > 0) {
          setSecondsLeft(quiz.timeLimitMinutes * 60);
        }
        setPhase('quiz');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load questions');
        setPhase('error');
      }
    },
    [quizId, quiz, isAuthenticated, getIdTokenClaims]
  );

  const submit = useCallback(
    (auto: boolean) => {
      if (!quizId || submittedRef.current) return;
      submittedRef.current = true;
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

  // Timer (exam mode only)
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

  const currentShuffledOptions = useMemo(() => {
    if (!currentQuestion) return [];
    const order = shuffleMap[currentQuestion.questionId];
    if (!order) return currentQuestion.options;
    return order.map((origIdx) => currentQuestion.options[origIdx]);
  }, [currentQuestion, shuffleMap]);

  const handleSelectOption = useCallback(
    (displayIndex: number) => {
      if (!currentQuestion || (mode === 'study' && feedbackRevealed)) return;
      const order = shuffleMap[currentQuestion.questionId];
      const originalIndex = order ? order[displayIndex] : displayIndex;
      setAnswers((prev) => {
        const existing = prev.find((a) => a.questionId === currentQuestion.questionId);
        if (existing) {
          return prev.map((a) =>
            a.questionId === currentQuestion.questionId
              ? { ...a, selectedOption: originalIndex }
              : a
          );
        }
        return [...prev, { questionId: currentQuestion.questionId, selectedOption: originalIndex }];
      });
    },
    [currentQuestion, shuffleMap, mode, feedbackRevealed]
  );

  const handleCheck = useCallback(() => {
    setFeedbackRevealed(true);
  }, []);

  const handleNext = useCallback(() => {
    setFeedbackRevealed(false);
    setCurrentIndex((i) => (i < questions.length - 1 ? i + 1 : i));
  }, [questions.length]);

  const handlePrevious = useCallback(() => {
    setFeedbackRevealed(false);
    setCurrentIndex((i) => (i > 0 ? i - 1 : i));
  }, []);

  const handleSubmit = useCallback(() => submit(false), [submit]);

  const isLast = currentIndex === questions.length - 1;
  const answeredCount = answers.filter((a) => a.selectedOption >= 0).length;
  const canSubmit = answeredCount === questions.length && questions.length > 0;
  const lowTime = secondsLeft !== null && secondsLeft <= 60;
  const hasAnswered = currentAnswer !== undefined && currentAnswer.selectedOption >= 0;

  // Keyboard shortcuts
  useEffect(() => {
    if (phase !== 'quiz' || !currentQuestion) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT'
      )
        return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key >= 'a' && e.key <= 'z') {
        const idx = e.key.charCodeAt(0) - 97;
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
        e.preventDefault();
        if (mode === 'study' && hasAnswered && !feedbackRevealed) {
          handleCheck();
        } else if (mode === 'study' && feedbackRevealed) {
          isLast ? handleSubmit() : handleNext();
        } else if (isLast && canSubmit) {
          handleSubmit();
        } else if (!isLast) {
          handleNext();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    phase,
    currentQuestion,
    currentIndex,
    isLast,
    canSubmit,
    handleSelectOption,
    handleNext,
    handlePrevious,
    handleSubmit,
    handleCheck,
    mode,
    hasAnswered,
    feedbackRevealed,
  ]);

  // --- RENDER PHASES ---

  if (phase === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (phase === 'auth') {
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

  if (phase === 'error') {
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

  // Mode selection screen
  if (phase === 'select' && quiz) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="card max-w-lg text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{quiz.title}</h2>
          <p className="text-gray-600 mb-8">
            {quiz.questionCount} questions
            {quiz.timeLimitMinutes ? ` · ${quiz.timeLimitMinutes} min` : ''}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              onClick={() => startQuiz('exam')}
              className="p-6 rounded-xl border-2 border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition-all text-left"
            >
              <div className="text-2xl mb-2">📝</div>
              <div className="font-semibold text-gray-900 mb-1">Exam Mode</div>
              <p className="text-sm text-gray-500">
                Answer all questions, then see your results.
                {quiz.timeLimitMinutes
                  ? ` ${quiz.timeLimitMinutes} minute time limit.`
                  : ' No time limit.'}
              </p>
            </button>
            {isAuthenticated ? (
              <button
                onClick={() => startQuiz('study')}
                className="p-6 rounded-xl border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all text-left"
              >
                <div className="text-2xl mb-2">📖</div>
                <div className="font-semibold text-gray-900 mb-1">Study Mode</div>
                <p className="text-sm text-gray-500">
                  Get instant feedback and explanations after each question. No timer.
                </p>
              </button>
            ) : (
              <div className="p-6 rounded-xl border-2 border-gray-200 bg-gray-50 text-left opacity-75">
                <div className="text-2xl mb-2">📖</div>
                <div className="font-semibold text-gray-900 mb-1">Study Mode</div>
                <p className="text-sm text-gray-500 mb-3">
                  Get instant feedback and explanations after each question.
                </p>
                <button
                  onClick={() => loginWithRedirect()}
                  className="text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  Log in to unlock →
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => navigate('/')}
            className="mt-6 text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to Quizzes
          </button>
        </div>
      </div>
    );
  }

  // Quiz phase
  if (!quiz || !currentQuestion) return null;

  const progress = ((currentIndex + 1) / questions.length) * 100;
  const studyQ = mode === 'study' && isStudyQuestion(currentQuestion) ? currentQuestion : null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{quiz.title}</h1>
            {mode === 'study' && (
              <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                Study
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            {secondsLeft !== null && (
              <span
                className={`text-sm font-mono font-semibold px-3 py-1 rounded-full ${lowTime ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}
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
          {currentShuffledOptions.map((option, displayIndex) => {
            const originalIndex =
              shuffleMap[currentQuestion.questionId]?.[displayIndex] ?? displayIndex;
            const isSelected = currentAnswer?.selectedOption === originalIndex;
            const showFeedback = mode === 'study' && feedbackRevealed && studyQ;
            const isCorrect = showFeedback && originalIndex === studyQ.correctAnswer;
            const isWrong = showFeedback && isSelected && originalIndex !== studyQ.correctAnswer;

            let borderClass = 'border-gray-200 hover:border-gray-300 bg-white';
            if (showFeedback && isCorrect) borderClass = 'border-green-500 bg-green-50';
            else if (showFeedback && isWrong) borderClass = 'border-red-500 bg-red-50';
            else if (isSelected) borderClass = 'border-primary-600 bg-primary-50';

            return (
              <button
                key={displayIndex}
                onClick={() => handleSelectOption(displayIndex)}
                disabled={mode === 'study' && feedbackRevealed}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all disabled:cursor-default ${borderClass}`}
              >
                <div className="flex items-center">
                  <div
                    className={`flex-shrink-0 w-6 h-6 rounded-full border-2 mr-3 flex items-center justify-center ${
                      showFeedback && isCorrect
                        ? 'border-green-600 bg-green-600'
                        : showFeedback && isWrong
                          ? 'border-red-600 bg-red-600'
                          : isSelected
                            ? 'border-primary-600 bg-primary-600'
                            : 'border-gray-300'
                    }`}
                  >
                    {(isSelected || (showFeedback && isCorrect)) && (
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        {showFeedback && isWrong ? (
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        ) : (
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        )}
                      </svg>
                    )}
                  </div>
                  <span
                    className="inline-flex items-center justify-center w-6 h-6 mr-3 text-xs font-mono font-semibold text-gray-500 bg-gray-100 rounded"
                    aria-hidden="true"
                  >
                    {OPTION_LABELS[displayIndex]}
                  </span>
                  <span className="text-gray-900">{option}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Study mode feedback */}
        {mode === 'study' && feedbackRevealed && studyQ && (
          <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-blue-900">
                {currentAnswer?.selectedOption === studyQ.correctAnswer
                  ? '✓ Correct!'
                  : '✗ Incorrect'}{' '}
                — {studyQ.lawReference}
              </p>
              <button
                onClick={() => setLawDrawerRef(studyQ.lawReference)}
                className="text-xs text-blue-700 underline underline-offset-2 hover:text-blue-900 flex-shrink-0 ml-2"
              >
                View Law →
              </button>
            </div>
            <p className="text-sm text-blue-800">{studyQ.explanation}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button onClick={handlePrevious} disabled={currentIndex === 0} className="btn-secondary">
          ← Previous
        </button>

        <div className="text-sm text-gray-600">
          {answeredCount} of {questions.length} answered
        </div>

        {mode === 'study' && hasAnswered && !feedbackRevealed ? (
          <button
            onClick={handleCheck}
            className="px-6 py-2 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700"
          >
            Check Answer
          </button>
        ) : isLast ? (
          <button
            onClick={handleSubmit}
            disabled={mode === 'study' ? !feedbackRevealed && hasAnswered : !canSubmit}
            className="btn-primary"
          >
            {mode === 'study' && !feedbackRevealed && !hasAnswered ? 'Submit Quiz' : 'Submit Quiz'}
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={mode === 'study' && hasAnswered && !feedbackRevealed}
            className="btn-primary"
          >
            {mode === 'study' && feedbackRevealed ? 'Continue →' : 'Next →'}
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
        {mode === 'study' && hasAnswered && !feedbackRevealed
          ? 'check'
          : isLast
            ? 'submit'
            : 'next'}
      </p>

      {lawDrawerRef && (
        <LawDrawer lawReference={lawDrawerRef} onClose={() => setLawDrawerRef(null)} />
      )}
    </div>
  );
}
