import { useEffect, useState } from 'react';
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

  const handleSelectOption = (optionIndex: number) => {
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
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmit = () => {
    if (!quizId) return;

    // Store answers in sessionStorage for results page
    sessionStorage.setItem('quizAnswers', JSON.stringify(answers));
    sessionStorage.setItem('quizQuestions', JSON.stringify(questions));

    navigate(`/quiz/${quizId}/results`);
  };

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
  const canSubmit = answeredCount === questions.length;

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

        {currentIndex === questions.length - 1 ? (
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
    </div>
  );
}
