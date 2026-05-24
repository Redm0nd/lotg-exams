import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { getQuizzes } from '../api/client';
import Hero from '../components/Hero';
import ScrollReveal from '../components/ScrollReveal';
import type { QuizSummary } from '../types';

const ALL_CATEGORIES = '__all__';

export default function QuizList() {
  const { isAuthenticated } = useAuth0();
  const navigate = useNavigate();
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
          <h2 className="text-xl font-bold text-red-600 mb-2 dark:text-red-400">Error</h2>
          <p className="text-gray-600 dark:text-gray-300">{error}</p>
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
        {isAuthenticated && (
          <ScrollReveal>
            <div className="mb-8 p-5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl flex items-center justify-between gap-4 dark:from-amber-950/40 dark:to-orange-950/40 dark:border-amber-800/60">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Practice Mode</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Targeted questions based on your weak areas — with instant feedback.
                </p>
              </div>
              <button
                onClick={() => navigate('/practice')}
                className="flex-shrink-0 px-4 py-2 rounded-lg font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors dark:bg-amber-600 dark:hover:bg-amber-500"
              >
                Start Practice
              </button>
            </div>
          </ScrollReveal>
        )}

        <ScrollReveal>
          <header className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Available Quizzes</h2>
            <p className="text-gray-600 dark:text-gray-400">Pick one to start practising.</p>
          </header>
        </ScrollReveal>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-300">Loading quizzes...</p>
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
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
              <p className="text-sm text-gray-500 mb-4 dark:text-gray-400" aria-live="polite">
                Showing {filtered.length} of {quizzes.length} quizzes
              </p>
            )}

            {!hasQuizzes ? (
              <div className="card text-center">
                <p className="text-gray-600 dark:text-gray-300">No quizzes available yet.</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="card text-center">
                <p className="text-gray-600 mb-3 dark:text-gray-300">
                  No quizzes match {isFiltering ? 'your filters' : 'your search'}.
                </p>
                <button
                  onClick={() => {
                    setSearch('');
                    setCategory(ALL_CATEGORIES);
                  }}
                  className="text-primary-600 hover:underline text-sm font-medium dark:text-primary-400"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {filtered.map((quiz, index) => {
                  const locked = !quiz.isPublic && !isAuthenticated;
                  return (
                    <ScrollReveal key={quiz.quizId} delayMs={Math.min(index * 60, 360)}>
                      <Link
                        to={locked ? '#' : `/quiz/${quiz.quizId}`}
                        onClick={locked ? (e) => e.preventDefault() : undefined}
                        className={`card-hover group block ${locked ? 'opacity-50 grayscale pointer-events-auto cursor-not-allowed' : ''}`}
                        aria-disabled={locked}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-xl font-semibold text-gray-900 group-hover:text-primary-600 transition-colors dark:text-gray-100 dark:group-hover:text-primary-400">
                            {quiz.title}
                          </h3>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {!quiz.isPublic && (
                              <span title="Login required" className="text-gray-400 dark:text-gray-500">
                                🔒
                              </span>
                            )}
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-300">
                              {quiz.questionCount} questions
                            </span>
                          </div>
                        </div>
                        <p className="text-gray-600 mb-4 dark:text-gray-400">{quiz.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500 dark:text-gray-400">{quiz.category}</span>
                          {locked ? (
                            <span className="text-gray-400 text-sm dark:text-gray-500">Login to access</span>
                          ) : (
                            <span className="text-primary-600 group-hover:translate-x-1 transition-transform dark:text-primary-400">
                              Start Quiz →
                            </span>
                          )}
                        </div>
                      </Link>
                    </ScrollReveal>
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
