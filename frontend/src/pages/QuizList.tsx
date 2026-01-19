import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getQuizzes } from '../api/client';
import type { QuizSummary } from '../types';

export default function QuizList() {
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadQuizzes() {
      try {
        const data = await getQuizzes();
        setQuizzes(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load quizzes');
      } finally {
        setLoading(false);
      }
    }

    loadQuizzes();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading quizzes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="card max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Laws of the Game Quizzes
        </h1>
        <p className="text-lg text-gray-600">
          Test your knowledge of football's Laws of the Game (IFAB)
        </p>
      </header>

      {quizzes.length === 0 ? (
        <div className="card text-center">
          <p className="text-gray-600">No quizzes available yet.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {quizzes.map((quiz) => (
            <Link
              key={quiz.quizId}
              to={`/quiz/${quiz.quizId}`}
              className="card-hover group"
            >
              <div className="flex items-start justify-between mb-3">
                <h2 className="text-xl font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                  {quiz.title}
                </h2>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
                  {quiz.questionCount} questions
                </span>
              </div>
              <p className="text-gray-600 mb-4">{quiz.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{quiz.category}</span>
                <span className="text-primary-600 group-hover:translate-x-1 transition-transform">
                  Start Quiz →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
