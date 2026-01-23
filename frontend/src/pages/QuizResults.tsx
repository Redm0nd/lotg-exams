import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { submitAnswers } from '../api/client';
import type { Answer, SubmitAnswersResponse } from '../types';

export default function QuizResults() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();

  const [results, setResults] = useState<SubmitAnswersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadResults() {
      const storedAnswers = sessionStorage.getItem('quizAnswers');

      if (!storedAnswers || !quizId) {
        navigate(`/quiz/${quizId}`);
        return;
      }

      try {
        const answers: Answer[] = JSON.parse(storedAnswers);
        const response = await submitAnswers(quizId, answers);
        setResults(response);
      } catch (err) {
        console.error('Error submitting answers:', err);
        setError(err instanceof Error ? err.message : 'Failed to load results');
      } finally {
        setLoading(false);
      }
    }

    loadResults();
  }, [quizId, navigate]);

  const handleRetry = () => {
    sessionStorage.removeItem('quizQuestions');
    sessionStorage.removeItem('quizAnswers');
    navigate(`/quiz/${quizId}`);
  };

  const handleBackToQuizzes = () => {
    sessionStorage.removeItem('quizQuestions');
    sessionStorage.removeItem('quizAnswers');
    navigate('/');
  };

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

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="card mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Quiz Results</h1>
        <div className="flex items-center justify-center gap-8 mb-4">
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

      <div className="space-y-6">
        {results.results.map((result, index) => (
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
                  {index + 1}. {result.text}
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
                            <span className="text-sm font-medium text-red-700">
                              Your Answer
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
