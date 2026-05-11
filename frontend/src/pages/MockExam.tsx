import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { useAccessToken } from '../hooks/useAccessToken';
import { getPracticeQuiz, submitAnswers } from '../api/client';
import { useStats } from '../contexts/StatsContext';
import LawDrawer from '../components/LawDrawer';
import type { StudyQuestion } from '../types';

const EXAM_DURATION_SECONDS = 30 * 60; // 30 minutes
const PASS_THRESHOLD = 75;
const OPTION_LABELS = 'ABCD';

type Phase = 'loading' | 'intro' | 'exam' | 'submitting' | 'result' | 'error';

interface ExamResult {
  score: number;
  total: number;
  percentage: number;
  results: { question: StudyQuestion; selected: number; correct: boolean }[];
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function MockExam() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, loginWithRedirect } = useAuth0();
  const { getToken } = useAccessToken();
  const { refresh: refreshStats } = useStats();

  const [phase, setPhase] = useState<Phase>('loading');
  const [questions, setQuestions] = useState<StudyQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(EXAM_DURATION_SECONDS);
  const [examResult, setExamResult] = useState<ExamResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lawDrawerRef, setLawDrawerRef] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) loginWithRedirect();
    if (!authLoading && isAuthenticated) setPhase('intro');
  }, [authLoading, isAuthenticated, loginWithRedirect]);

  const submit = useCallback(
    async (currentAnswers: Record<number, number>, qs: StudyQuestion[]) => {
      setPhase('submitting');
      if (timerRef.current) clearInterval(timerRef.current);

      const token = await getToken();
      const apiAnswers = qs.map((q, i) => ({
        questionId: q.questionId,
        selectedOption: currentAnswers[i] ?? -1,
      }));

      try {
        // submitAnswers needs a quizId — use a sentinel for mock exam
        // We'll call it directly as a standalone attempt
        const correctCount = qs.filter((q, i) => (currentAnswers[i] ?? -1) === q.correctAnswer).length;
        const pct = Math.round((correctCount / qs.length) * 100);

        // Build per-question results for display
        const results = qs.map((q, i) => ({
          question: q,
          selected: currentAnswers[i] ?? -1,
          correct: (currentAnswers[i] ?? -1) === q.correctAnswer,
        }));

        // Submit to backend for stats tracking — use the first quizId we have or skip
        // Since mock exam questions don't belong to a specific quiz, we submit without a quizId
        // by calling the practice quiz submit path
        try {
          await submitAnswers('mock-exam', apiAnswers, token!);
        } catch {
          // Non-fatal — stats won't update but result is still shown
        }

        refreshStats();
        setExamResult({ score: correctCount, total: qs.length, percentage: pct, results });
        setPhase('result');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to submit');
        setPhase('error');
      }
    },
    [getToken, refreshStats]
  );

  async function startExam() {
    setPhase('loading');
    try {
      const token = await getToken();
      const data = await getPracticeQuiz(token!, 25, true);
      setQuestions(data.questions);
      setAnswers({});
      setCurrentIndex(0);
      setSecondsLeft(EXAM_DURATION_SECONDS);
      setPhase('exam');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load questions');
      setPhase('error');
    }
  }

  // Timer
  useEffect(() => {
    if (phase !== 'exam') return;
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          submit(answers, questions);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, answers, questions, submit]);

  // Keyboard navigation
  useEffect(() => {
    if (phase !== 'exam') return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        setCurrentIndex((i) => Math.min(i + 1, questions.length - 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentIndex((i) => Math.max(i - 1, 0));
      } else if (['a','b','c','d'].includes(e.key.toLowerCase())) {
        const idx = 'abcd'.indexOf(e.key.toLowerCase());
        if (idx < questions[currentIndex]?.options.length) {
          setAnswers((prev) => ({ ...prev, [currentIndex]: idx }));
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, currentIndex, questions]);

  if (phase === 'loading' || phase === 'submitting') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4" />
          <p className="text-gray-600">{phase === 'submitting' ? 'Submitting exam…' : 'Loading questions…'}</p>
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="card max-w-md text-center">
          <p className="text-red-600 font-medium mb-4">{error}</p>
          <button onClick={() => navigate('/')} className="btn-secondary">Back to Quizzes</button>
        </div>
      </div>
    );
  }

  if (phase === 'intro') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="card max-w-lg text-center">
          <div className="text-4xl mb-4">📋</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Mock Exam</h2>
          <p className="text-gray-600 mb-6">
            25 questions across all 17 Laws of the Game. 30 minutes. No feedback during the exam.
            You need <span className="font-semibold">75% to pass</span>.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left text-sm text-amber-800 space-y-1">
            <p>• Answer all questions before time runs out</p>
            <p>• You can navigate back and change answers</p>
            <p>• Unanswered questions count as wrong</p>
            <p>• The exam auto-submits when the timer reaches 0</p>
          </div>
          <button onClick={startExam} className="btn-primary w-full text-lg py-3">
            Start Exam →
          </button>
          <button onClick={() => navigate('/')} className="mt-3 text-sm text-gray-500 hover:text-gray-700">
            ← Back to Quizzes
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'result' && examResult) {
    const passed = examResult.percentage >= PASS_THRESHOLD;
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Result banner */}
        <div className={`rounded-2xl p-8 text-center mb-8 ${passed ? 'bg-green-50 border-2 border-green-400' : 'bg-red-50 border-2 border-red-400'}`}>
          <div className="text-5xl mb-3">{passed ? '🎉' : '📚'}</div>
          <h2 className={`text-3xl font-bold mb-1 ${passed ? 'text-green-700' : 'text-red-700'}`}>
            {passed ? 'Pass!' : 'Not yet'}
          </h2>
          <p className={`text-5xl font-bold mb-2 ${passed ? 'text-green-600' : 'text-red-600'}`}>
            {examResult.percentage}%
          </p>
          <p className="text-gray-600">
            {examResult.score} / {examResult.total} correct · Pass mark: {PASS_THRESHOLD}%
          </p>
        </div>

        {/* Per-question review */}
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Question Review</h3>
        <div className="space-y-4 mb-8">
          {examResult.results.map(({ question, selected, correct }, i) => (
            <div key={question.questionId} className={`card border-l-4 ${correct ? 'border-green-400' : 'border-red-400'}`}>
              <div className="flex items-start justify-between mb-2">
                <p className="text-sm font-medium text-gray-500">
                  Q{i + 1} · {correct ? '✓ Correct' : '✗ Incorrect'} · {question.lawReference}
                </p>
                <button
                  onClick={() => setLawDrawerRef(question.lawReference)}
                  className="text-xs text-blue-600 underline underline-offset-2 hover:text-blue-800 flex-shrink-0 ml-2"
                >
                  View Law →
                </button>
              </div>
              <p className="text-gray-900 mb-3 text-sm">{question.text}</p>
              <div className="space-y-1">
                {question.options.map((opt, oi) => {
                  const isSelected = selected === oi;
                  const isCorrect = question.correctAnswer === oi;
                  let cls = 'text-xs px-3 py-1.5 rounded border ';
                  if (isCorrect) cls += 'bg-green-50 border-green-400 text-green-800 font-medium';
                  else if (isSelected) cls += 'bg-red-50 border-red-300 text-red-700';
                  else cls += 'bg-gray-50 border-gray-200 text-gray-600';
                  return (
                    <div key={oi} className={cls}>
                      {OPTION_LABELS[oi]}. {opt}
                      {isCorrect && ' ✓'}
                      {isSelected && !isCorrect && ' ✗'}
                    </div>
                  );
                })}
              </div>
              {!correct && (
                <p className="mt-2 text-xs text-blue-700 bg-blue-50 p-2 rounded">{question.explanation}</p>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3 flex-wrap">
          <button onClick={startExam} className="btn-primary">Retake Exam</button>
          <button onClick={() => navigate('/practice')} className="btn-secondary">Practice Mode</button>
          <button onClick={() => navigate('/')} className="btn-secondary">Back to Quizzes</button>
        </div>

        {lawDrawerRef && (
          <LawDrawer lawReference={lawDrawerRef} onClose={() => setLawDrawerRef(null)} />
        )}
      </div>
    );
  }

  // Exam phase
  const q = questions[currentIndex];
  const answered = Object.keys(answers).length;
  const urgentTime = secondsLeft <= 300; // last 5 minutes

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      {/* Timer + progress bar */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500">
          Q {currentIndex + 1} / {questions.length} · {answered} answered
        </span>
        <span className={`font-mono text-lg font-bold px-3 py-1 rounded-lg ${urgentTime ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-gray-100 text-gray-700'}`}>
          {formatTime(secondsLeft)}
        </span>
      </div>

      {/* Answer progress dots */}
      <div className="flex gap-1 mb-6 flex-wrap">
        {questions.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`h-2.5 w-2.5 rounded-full transition-colors ${
              i === currentIndex ? 'bg-blue-600 ring-2 ring-blue-300' :
              answers[i] !== undefined ? 'bg-green-400' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {/* Question card */}
      <div className="card mb-6">
        <p className="text-xs text-gray-400 mb-2">{q.lawReference}</p>
        <p className="text-gray-900 font-medium mb-5 text-lg leading-relaxed">{q.text}</p>
        <div className="space-y-3">
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => setAnswers((prev) => ({ ...prev, [currentIndex]: i }))}
              className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                answers[currentIndex] === i
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <span className="font-semibold mr-2">{OPTION_LABELS[i]}.</span> {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentIndex((i) => Math.max(i - 1, 0))}
          disabled={currentIndex === 0}
          className="btn-secondary"
        >
          ← Previous
        </button>

        {currentIndex < questions.length - 1 ? (
          <button onClick={() => setCurrentIndex((i) => i + 1)} className="btn-primary">
            Next →
          </button>
        ) : (
          <button
            onClick={() => submit(answers, questions)}
            className="px-6 py-2 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700"
          >
            Submit Exam
          </button>
        )}
      </div>

      <p className="text-center text-xs text-gray-400 mt-6 hidden sm:block">
        A–D select answer · ← → navigate · Enter next
      </p>
    </div>
  );
}
