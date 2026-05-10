import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { getPracticeQuiz } from '../api/client';
import type { StudyQuestion, Answer, Law } from '../types';
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

function buildShuffleMap(questions: StudyQuestion[]): Record<string, number[]> {
  const map: Record<string, number[]> = {};
  for (const q of questions) {
    map[q.questionId] = shuffleArray(q.options.map((_, i) => i));
  }
  return map;
}

type Phase = 'loading' | 'preview' | 'quiz' | 'results' | 'error';

interface QuestionResult {
  question: StudyQuestion;
  selectedOption: number;
  isCorrect: boolean;
}

export default function PracticeTake() {
  const navigate = useNavigate();
  const { getIdTokenClaims } = useAuth0();

  const [phase, setPhase] = useState<Phase>('loading');
  const [questions, setQuestions] = useState<StudyQuestion[]>([]);
  const [focusLaws, setFocusLaws] = useState<Law[]>([]);
  const [shuffleMap, setShuffleMap] = useState<Record<string, number[]>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [feedbackRevealed, setFeedbackRevealed] = useState(false);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lawDrawerRef, setLawDrawerRef] = useState<string | null>(null);

  const answersRef = useRef<Answer[]>([]);
  useEffect(() => { answersRef.current = answers; }, [answers]);

  useEffect(() => {
    async function load() {
      try {
        const claims = await getIdTokenClaims();
        const token = claims?.__raw;
        if (!token) {
          setError('Authentication required');
          setPhase('error');
          return;
        }
        const data = await getPracticeQuiz(token, 20);
        if (data.questions.length === 0) {
          setError('No approved questions available yet. Check back after an admin publishes a quiz.');
          setPhase('error');
          return;
        }
        setQuestions(data.questions);
        setFocusLaws(data.focusLaws);
        setShuffleMap(buildShuffleMap(data.questions));
        setPhase('preview');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load practice questions');
        setPhase('error');
      }
    }
    load();
  }, [getIdTokenClaims]);

  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers.find((a) => a.questionId === currentQuestion?.questionId);
  const hasAnswered = currentAnswer !== undefined && currentAnswer.selectedOption >= 0;
  const isLast = currentIndex === questions.length - 1;

  const currentShuffledOptions = useMemo(() => {
    if (!currentQuestion) return [];
    const order = shuffleMap[currentQuestion.questionId];
    return order ? order.map((i) => currentQuestion.options[i]) : currentQuestion.options;
  }, [currentQuestion, shuffleMap]);

  const handleSelectOption = useCallback(
    (displayIndex: number) => {
      if (!currentQuestion || feedbackRevealed) return;
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
    [currentQuestion, shuffleMap, feedbackRevealed]
  );

  const handleCheck = useCallback(() => setFeedbackRevealed(true), []);

  const handleNext = useCallback(() => {
    setFeedbackRevealed(false);
    setCurrentIndex((i) => i + 1);
  }, []);

  const handleFinish = useCallback(() => {
    const finalResults: QuestionResult[] = questions.map((q) => {
      const ans = answersRef.current.find((a) => a.questionId === q.questionId);
      const selected = ans?.selectedOption ?? -1;
      return { question: q, selectedOption: selected, isCorrect: selected === q.correctAnswer };
    });
    setResults(finalResults);
    setPhase('results');
  }, [questions]);

  // Keyboard shortcuts
  useEffect(() => {
    if (phase !== 'quiz' || !currentQuestion) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.isContentEditable || target?.tagName === 'INPUT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key >= 'a' && e.key <= 'z') {
        const idx = e.key.charCodeAt(0) - 97;
        if (idx < currentQuestion.options.length) { e.preventDefault(); handleSelectOption(idx); }
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (hasAnswered && !feedbackRevealed) handleCheck();
        else if (feedbackRevealed) isLast ? handleFinish() : handleNext();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, currentQuestion, hasAnswered, feedbackRevealed, isLast, handleSelectOption, handleCheck, handleNext, handleFinish]);

  if (phase === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
          <p className="mt-4 text-gray-600">Building your practice session...</p>
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="card max-w-md text-center">
          <p className="text-gray-600 mb-4">{error}</p>
          <button onClick={() => navigate('/')} className="btn-secondary">Back to Quizzes</button>
        </div>
      </div>
    );
  }

  if (phase === 'preview') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="card max-w-lg text-center">
          <div className="text-4xl mb-4">🎯</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Practice Mode</h2>
          <p className="text-gray-600 mb-6">
            {questions.length} questions across all laws, weighted towards your weakest areas.
            Get instant feedback after each answer.
          </p>

          <button onClick={() => setPhase('quiz')} className="btn-primary w-full">
            Start Practice →
          </button>
          <button onClick={() => navigate('/')} className="mt-3 text-sm text-gray-500 hover:text-gray-700">
            ← Back to Quizzes
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'results') {
    const correct = results.filter((r) => r.isCorrect).length;
    const pct = Math.round((correct / results.length) * 100);
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="card text-center mb-8">
          <div className="text-5xl font-bold text-primary-600 mb-2">{pct}%</div>
          <p className="text-gray-600 mb-1">
            {correct} of {results.length} correct
          </p>
          <p className="text-sm text-gray-400">Practice complete</p>
          <div className="mt-6 flex gap-3 justify-center">
            <button onClick={() => navigate('/practice')} className="btn-primary">
              Practice Again
            </button>
            <button onClick={() => navigate('/')} className="btn-secondary">
              Back to Quizzes
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {results.map((r, idx) => (
            <div
              key={r.question.questionId}
              className={`card border-l-4 ${r.isCorrect ? 'border-green-500' : 'border-red-500'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-gray-500">
                  Q{idx + 1} · {r.isCorrect ? '✓ Correct' : '✗ Incorrect'} · {r.question.lawReference}
                </p>
                <button
                  onClick={() => setLawDrawerRef(r.question.lawReference)}
                  className="text-xs text-blue-700 underline underline-offset-2 hover:text-blue-900 flex-shrink-0 ml-2"
                >
                  View Law →
                </button>
              </div>
              <p className="text-gray-900 mb-3">{r.question.text}</p>
              {!r.isCorrect && (
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Correct answer:</span>{' '}
                  {r.question.options[r.question.correctAnswer]}
                </p>
              )}
              <p className="text-sm text-blue-700 bg-blue-50 p-3 rounded">{r.question.explanation}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Quiz phase
  if (!currentQuestion) return null;

  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">Practice Mode</h1>
            <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
              Study
            </span>
          </div>
          <span className="text-sm text-gray-600">
            Question {currentIndex + 1} of {questions.length}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="card mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">{currentQuestion.text}</h2>

        <div className="space-y-3">
          {currentShuffledOptions.map((option, displayIndex) => {
            const originalIndex = shuffleMap[currentQuestion.questionId]?.[displayIndex] ?? displayIndex;
            const isSelected = currentAnswer?.selectedOption === originalIndex;
            const showFeedback = feedbackRevealed;
            const isCorrect = showFeedback && originalIndex === currentQuestion.correctAnswer;
            const isWrong = showFeedback && isSelected && !isCorrect;

            let borderClass = 'border-gray-200 hover:border-gray-300 bg-white';
            if (isCorrect) borderClass = 'border-green-500 bg-green-50';
            else if (isWrong) borderClass = 'border-red-500 bg-red-50';
            else if (isSelected) borderClass = 'border-primary-600 bg-primary-50';

            return (
              <button
                key={displayIndex}
                onClick={() => handleSelectOption(displayIndex)}
                disabled={feedbackRevealed}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all disabled:cursor-default ${borderClass}`}
              >
                <div className="flex items-center">
                  <div
                    className={`flex-shrink-0 w-6 h-6 rounded-full border-2 mr-3 flex items-center justify-center ${
                      isCorrect
                        ? 'border-green-600 bg-green-600'
                        : isWrong
                          ? 'border-red-600 bg-red-600'
                          : isSelected
                            ? 'border-primary-600 bg-primary-600'
                            : 'border-gray-300'
                    }`}
                  >
                    {(isSelected || isCorrect) && (
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        {isWrong ? (
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        ) : (
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        )}
                      </svg>
                    )}
                  </div>
                  <span className="inline-flex items-center justify-center w-6 h-6 mr-3 text-xs font-mono font-semibold text-gray-500 bg-gray-100 rounded">
                    {OPTION_LABELS[displayIndex]}
                  </span>
                  <span className="text-gray-900">{option}</span>
                </div>
              </button>
            );
          })}
        </div>

        {feedbackRevealed && (
          <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-blue-900">
                {currentAnswer?.selectedOption === currentQuestion.correctAnswer ? '✓ Correct!' : '✗ Incorrect'}{' '}
                — {currentQuestion.lawReference}
              </p>
              <button
                onClick={() => setLawDrawerRef(currentQuestion.lawReference)}
                className="text-xs text-blue-700 underline underline-offset-2 hover:text-blue-900 flex-shrink-0 ml-2"
              >
                View Law →
              </button>
            </div>
            <p className="text-sm text-blue-800">{currentQuestion.explanation}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div />
        {hasAnswered && !feedbackRevealed ? (
          <button onClick={handleCheck} className="px-6 py-2 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700">
            Check Answer
          </button>
        ) : feedbackRevealed && isLast ? (
          <button onClick={handleFinish} className="btn-primary">
            See Results
          </button>
        ) : feedbackRevealed ? (
          <button onClick={handleNext} className="btn-primary">
            Continue →
          </button>
        ) : (
          <div />
        )}
      </div>

      <p className="hidden sm:block text-center text-xs text-gray-400 mt-6">
        Shortcuts:{' '}
        <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded">A</kbd>–
        <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded">
          {OPTION_LABELS[currentQuestion.options.length - 1]}
        </kbd>{' '}
        select ·{' '}
        <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded">Enter</kbd>{' '}
        {hasAnswered && !feedbackRevealed ? 'check' : feedbackRevealed ? (isLast ? 'results' : 'next') : ''}
      </p>

      {lawDrawerRef && (
        <LawDrawer lawReference={lawDrawerRef} onClose={() => setLawDrawerRef(null)} />
      )}
    </div>
  );
}
