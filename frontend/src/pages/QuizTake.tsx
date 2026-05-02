import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQuiz, getQuestions } from '../api/client';
import type { QuizDetail, Question, Answer } from '../types';

export default function QuizTake() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadQuiz() {
      if (!quizId) return;

      try {
        const [quizData, questionsData] = await Promise.all([
          getQuiz(quizId),
          getQuestions(quizId, 10),
        ]);
        setQuiz(quizData);
        setQuestions(questionsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load quiz');
      } finally {
        setLoading(false);
      }
    }

    loadQuiz();
  }, [quizId]);

  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers.find(
    (a) => a.questionId === currentQuestion?.questionId
  );

  const handleSelectOption = useCallback(
    (optionIndex: number) => {
      if (!currentQuestion) return;

      setAnswers((prev) => {
        const existing = prev.find((a) => a.questionId === currentQuestion.questionId);
        if (existing) {
          return prev.map((a) =>
            a.questionId === currentQuestion.questionId
              ? { ...a, selectedOption: optionIndex }
              : a
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

  const handleSubmit = useCallback(() => {
    if (!quizId) return;

    sessionStorage.setItem('quizAnswers', JSON.stringify(answers));
    sessionStorage.setItem('quizQuestions', JSON.stringify(questions));

    navigate(`/quiz/${quizId}/results`);
  }, [quizId, answers, questions, navigate]);

  const isLast = currentIndex === questions.length - 1;
  const canSubmit = answers.length === questions.length && questions.length > 0;

  useEffect(() => {
    if (loading || error || !currentQuestion) return;

    const onKeyDown = (e: KeyboardEvent) => {
      // Ignore if focus is in an editable element (defensive — none on this page today)
      const target = e.target as HTMLElement | null;
      if (target?.isContentEditable) return;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Number keys 1-9 select the matching option (when present)
      if (e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key, 10) - 1;
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
  const answeredCount = answers.length;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900">{quiz.title}</h1>
          <span className="text-sm text-gray-600">
            Question {currentIndex + 1} of {questions.length}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      <div className="card mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          {currentQuestion.text}
        </h2>

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
                  {index + 1}
                </span>
                <span className="text-gray-900">{option}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="btn-secondary"
        >
          ← Previous
        </button>

        <div className="text-sm text-gray-600">
          {answeredCount} of {questions.length} answered
        </div>

        {isLast ? (
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="btn-primary"
          >
            Submit Quiz
          </button>
        ) : (
          <button onClick={handleNext} className="btn-primary">
            Next →
          </button>
        )}
      </div>

      <p className="hidden sm:block text-center text-xs text-gray-400 mt-6">
        Shortcuts: <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded">1</kbd>–<kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded">{currentQuestion.options.length}</kbd> select
        · <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded">←</kbd>/<kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded">→</kbd> nav
        · <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded">Enter</kbd> {isLast ? 'submit' : 'next'}
      </p>
    </div>
  );
}
