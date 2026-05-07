import { useEffect, useRef, useState } from 'react';

interface SampleQuestion {
  text: string;
  options: string[];
  correctIndex: number;
  // Optional scripted "user pick" to demonstrate the answer flow.
  // null = no pick is simulated; the correct answer just gets highlighted.
  scriptedPick: number | null;
  lawReference: string;
  // Tailwind hue used for the flowing accent stripe at the top of the card.
  accent: { from: string; via: string; to: string };
}

const SAMPLES: SampleQuestion[] = [
  {
    // Offside re-determination after a deliberate save.
    text:
      'An attacker is in an offside position when their teammate shoots. The goalkeeper makes a deliberate save and the ball rebounds to the attacker, who then scores. What is the correct decision?',
    options: [
      'Goal stands — the keeper played the ball',
      'Offside — a deliberate save does not reset the offside',
      'Drop ball at the point of the rebound',
      'Indirect free kick to the attacking team',
    ],
    correctIndex: 1,
    scriptedPick: 1,
    lawReference: 'Law 11',
    accent: { from: 'from-primary-500', via: 'via-primary-300', to: 'to-primary-600' },
  },
  {
    // 2025/26 IFAB change: 8-second goalkeeper rule restarts with a corner kick.
    text:
      'Under the 2025/26 Laws, a goalkeeper holds the ball in their hands inside the penalty area for more than 8 seconds. What does the referee award?',
    options: [
      'Indirect free kick where the ball was held',
      'Yellow card and indirect free kick',
      'Corner kick to the opposing team',
      'Drop ball at the edge of the penalty area',
    ],
    correctIndex: 2,
    // Demonstrate the "wrong pick" flow on this one — old (pre-2025) IFAB
    // would have called an indirect free kick, so it's a tempting trap.
    scriptedPick: 0,
    lawReference: 'Law 12',
    accent: { from: 'from-amber-400', via: 'via-orange-300', to: 'to-rose-500' },
  },
  {
    // Accidental handball in the immediate buildup to a goal.
    text:
      'An attacker scores after the ball has come off their arm in the immediate buildup. The contact was unintentional. What is the correct decision?',
    options: [
      'Goal stands — the contact was unintentional',
      'Disallow the goal — accidental handball in the immediate scoring buildup is still a handball offence',
      'Drop ball where the contact happened',
      'Indirect free kick to the defending team',
    ],
    correctIndex: 1,
    scriptedPick: 1,
    lawReference: 'Law 12',
    accent: { from: 'from-emerald-400', via: 'via-teal-300', to: 'to-cyan-500' },
  },
];

const LETTERS = ['A', 'B', 'C', 'D'];

const TOTAL_MS = 20_000;
const PICK_AT_MS = 6_000;
const REVEAL_AT_MS = 9_500;
const FADE_MS = 350;

type Phase = 'idle' | 'picked' | 'revealed';

export default function SampleQuestion() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [visible, setVisible] = useState(true);
  const reducedMotion = useRef(
    typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    if (reducedMotion.current) {
      setPhase('revealed');
      return;
    }

    const timers: number[] = [];
    setPhase('idle');

    timers.push(window.setTimeout(() => setPhase('picked'), PICK_AT_MS));
    timers.push(window.setTimeout(() => setPhase('revealed'), REVEAL_AT_MS));
    timers.push(
      window.setTimeout(() => {
        setVisible(false);
        timers.push(
          window.setTimeout(() => {
            setIndex((i) => (i + 1) % SAMPLES.length);
            setPhase('idle');
            setVisible(true);
          }, FADE_MS)
        );
      }, TOTAL_MS)
    );

    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
  }, [index]);

  const sample = SAMPLES[index];
  const pickedIndex = sample.scriptedPick;
  const revealed = phase === 'revealed';
  const showsPick = (phase === 'picked' || phase === 'revealed') && pickedIndex !== null;

  return (
    <div className="relative bg-white rounded-2xl shadow-lg ring-1 ring-gray-200 overflow-hidden">
      {/* Flowing accent stripe — colour shifts per question, gradient continually pans. */}
      <div
        className={`h-1 bg-gradient-to-r animate-shimmer ${sample.accent.from} ${sample.accent.via} ${sample.accent.to}`}
        aria-hidden="true"
      />

      <div className="p-6 sm:p-7">
        <div className="flex items-center justify-between mb-4">
          <span className="inline-flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
            <span
              className="inline-block w-1.5 h-1.5 bg-primary-500 rounded-full"
              aria-hidden="true"
            />
            Sample question
          </span>
          <span className="text-xs font-mono text-gray-400">{sample.lawReference}</span>
        </div>

        <div
          className="transition-opacity"
          style={{ opacity: visible ? 1 : 0, transitionDuration: `${FADE_MS}ms` }}
        >
          <p className="text-base sm:text-lg font-medium text-gray-900 leading-snug min-h-[5.5rem]">
            {sample.text}
          </p>

          <ul className="mt-4 space-y-2">
            {sample.options.map((opt, i) => {
              const isCorrect = i === sample.correctIndex;
              const isPicked = pickedIndex === i;
              const wrongPick = revealed && isPicked && !isCorrect;
              const showCorrect = revealed && isCorrect;

              const base = 'border-gray-200 bg-white text-gray-800';
              const pickedTone = 'border-primary-500 bg-primary-50 text-primary-900';
              const correctTone = 'border-green-500 bg-green-50 text-green-900';
              const wrongTone = 'border-red-500 bg-red-50 text-red-900';

              const tone = showCorrect
                ? correctTone
                : wrongPick
                  ? wrongTone
                  : showsPick && isPicked
                    ? pickedTone
                    : base;

              const badgeBase = 'bg-gray-100 text-gray-500';
              const badgePicked = 'bg-primary-500 text-white';
              const badgeCorrect = 'bg-green-500 text-white';
              const badgeWrong = 'bg-red-500 text-white';

              const badgeTone = showCorrect
                ? badgeCorrect
                : wrongPick
                  ? badgeWrong
                  : showsPick && isPicked
                    ? badgePicked
                    : badgeBase;

              const badgeContent = showCorrect ? '✓' : wrongPick ? '✗' : LETTERS[i];

              return (
                <li
                  key={i}
                  className={`flex items-center gap-3 rounded-lg border-2 px-3 py-2.5 text-sm transition-colors duration-300 ${tone}`}
                >
                  <span
                    className={`flex-shrink-0 inline-flex items-center justify-center w-6 h-6 text-xs font-mono font-semibold rounded transition-colors duration-300 ${badgeTone}`}
                    aria-hidden="true"
                  >
                    {badgeContent}
                  </span>
                  <span className="flex-1">{opt}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-5 flex items-center justify-between text-xs text-gray-400">
          <span aria-live="polite" aria-atomic="true">
            {index + 1} / {SAMPLES.length}
          </span>
          <span>{revealed ? 'Answer revealed · rotating' : 'Auto-playing demo'}</span>
        </div>
      </div>
    </div>
  );
}
