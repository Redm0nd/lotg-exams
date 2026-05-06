import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { getQuizzes } from '../api/client';
import Hero from '../components/Hero';
import type { QuizSummary } from '../types';

const ALL_CATEGORIES = '__all__';

export default function QuizList() {
  const { isAuthenticated } = useAuth0();
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const quizzesRef = useRef<HTMLDivElement>(null);

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

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const q of quizzes) {
      if (q.category) set.add(q.category);
    }
    return Array.from(set).sort();
  }, [quizzes]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return quizzes.filter((q) => {
      if (category !== ALL_CATEGORIES && q.category !== category) return false;
      if (!needle) return true;
      return q.title.toLowerCase().includes(needle) || q.description.toLowerCase().includes(needle);
    });
  }, [quizzes, search, category]);

  const scrollToQuizzes = () => {
    quizzesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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

  const isFiltering = search.trim() !== '' || category !== ALL_CATEGORIES;
  const hasQuizzes = quizzes.length > 0;

  return (
    <>
      <Hero onStartClick={scrollToQuizzes} />

      <div
        ref={quizzesRef}
        id="quizzes"
        className="container mx-auto px-4 py-12 max-w-4xl scroll-mt-16"
      >
        <header className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Available Quizzes</h2>
          <p className="text-gray-600">Pick one to start practising.</p>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              <p className="mt-4 text-gray-600">Loading quizzes...</p>
            </div>
          </div>
        ) : (
          <>
            {hasQuizzes && (
              <div className="mb-6 flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label htmlFor="quiz-search" className="sr-only">
                    Search quizzes
                  </label>
                  <input
                    id="quiz-search"
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search quizzes..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                {categories.length > 1 && (
                  <div className="sm:w-56">
                    <label htmlFor="quiz-category" className="sr-only">
                      Filter by category
                    </label>
                    <select
                      id="quiz-category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                    >
                      <option value={ALL_CATEGORIES}>All categories</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {hasQuizzes && (
              <p className="text-sm text-gray-500 mb-4" aria-live="polite">
                Showing {filtered.length} of {quizzes.length} quizzes
              </p>
            )}

            {!hasQuizzes ? (
              <div className="card text-center">
                <p className="text-gray-600">No quizzes available yet.</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="card text-center">
                <p className="text-gray-600 mb-3">
                  No quizzes match {isFiltering ? 'your filters' : 'your search'}.
                </p>
                <button
                  onClick={() => {
                    setSearch('');
                    setCategory(ALL_CATEGORIES);
                  }}
                  className="text-primary-600 hover:underline text-sm font-medium"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {filtered.map((quiz) => {
                  const locked = !quiz.isPublic && !isAuthenticated;
                  return (
                    <Link
                      key={quiz.quizId}
                      to={locked ? '#' : `/quiz/${quiz.quizId}`}
                      onClick={locked ? (e) => e.preventDefault() : undefined}
                      className={`card-hover group ${locked ? 'opacity-50 grayscale pointer-events-auto cursor-not-allowed' : ''}`}
                      aria-disabled={locked}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-xl font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                          {quiz.title}
                        </h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!quiz.isPublic && (
                            <span title="Login required" className="text-gray-400">
                              🔒
                            </span>
                          )}
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
                            {quiz.questionCount} questions
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-600 mb-4">{quiz.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">{quiz.category}</span>
                        {locked ? (
                          <span className="text-gray-400 text-sm">Login to access</span>
                        ) : (
                          <span className="text-primary-600 group-hover:translate-x-1 transition-transform">
                            Start Quiz →
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
