import { useEffect, useRef, useState } from 'react';

interface SampleQuestion {
  text: string;
  options: string[];
  correctIndex: number;
  lawReference: string;
}

const SAMPLES: SampleQuestion[] = [
  {
    text: 'How many players from each team are on the field at the start of a match?',
    options: ['9', '10', '11', '12'],
    correctIndex: 2,
    lawReference: 'Law 3',
  },
  {
    text: 'What is the minimum number of players a team must have for a match to continue?',
    options: ['5', '6', '7', '8'],
    correctIndex: 2,
    lawReference: 'Law 3',
  },
  {
    text: 'A back-pass is deliberately kicked by a defender to the goalkeeper. The keeper picks it up. What does the referee award?',
    options: [
      'Penalty kick',
      'Direct free kick',
      'Indirect free kick from where the keeper handled it',
      'Drop ball',
    ],
    correctIndex: 2,
    lawReference: 'Law 12',
  },
  {
    text: 'The ball deflects off the referee and goes directly into the goal. What is the correct restart?',
    options: [
      'Goal stands',
      'Drop ball where the deflection happened',
      'Indirect free kick to the defending team',
      'Corner kick',
    ],
    correctIndex: 1,
    lawReference: 'Law 9',
  },
  {
    text: 'How is added time at the end of each half determined?',
    options: [
      'Always 30 seconds per half',
      'Fixed at 3 minutes per half',
      'Decided by the referee, accounting for stoppages',
      'Decided by the fourth official only',
    ],
    correctIndex: 2,
    lawReference: 'Law 7',
  },
];

const LETTERS = ['A', 'B', 'C', 'D'];
const ROTATION_MS = 8000;
const REVEAL_DELAY_MS = 3500;
const FADE_MS = 350;

export default function SampleQuestion() {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [visible, setVisible] = useState(true);
  const reducedMotion = useRef(
    typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    if (reducedMotion.current) {
      setRevealed(true);
      return;
    }

    const revealTimer = window.setTimeout(() => setRevealed(true), REVEAL_DELAY_MS);
    const advanceTimer = window.setTimeout(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % SAMPLES.length);
        setRevealed(false);
        setVisible(true);
      }, FADE_MS);
    }, ROTATION_MS);

    return () => {
      window.clearTimeout(revealTimer);
      window.clearTimeout(advanceTimer);
    };
  }, [index]);

  const sample = SAMPLES[index];

  return (
    <div className="bg-white rounded-2xl shadow-lg ring-1 ring-gray-200 p-6 sm:p-7 dark:bg-gray-800 dark:ring-gray-700 dark:shadow-black/30">
      <div className="flex items-center justify-between mb-4">
        <span className="inline-flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide dark:text-gray-400">
          <span className="inline-block w-1.5 h-1.5 bg-primary-500 rounded-full" aria-hidden="true" />
          Sample question
        </span>
        <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{sample.lawReference}</span>
      </div>

      <div
        className={`transition-opacity ${visible ? 'opacity-100' : 'opacity-0'}`}
        style={{ transitionDuration: `${FADE_MS}ms` }}
      >
        <p className="text-base sm:text-lg font-medium text-gray-900 leading-snug min-h-[3.5rem] dark:text-gray-100">
          {sample.text}
        </p>

        <ul className="mt-4 space-y-2">
          {sample.options.map((opt, i) => {
            const isCorrect = i === sample.correctIndex;
            const showCorrect = revealed && isCorrect;
            return (
              <li
                key={i}
                className={`flex items-center gap-3 rounded-lg border-2 px-3 py-2.5 text-sm transition-colors duration-300 ${
                  showCorrect
                    ? 'border-green-500 bg-green-50 text-green-900 dark:bg-green-900/30 dark:text-green-200 dark:border-green-500'
                    : 'border-gray-200 bg-white text-gray-800 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200'
                }`}
              >
                <span
                  className={`flex-shrink-0 inline-flex items-center justify-center w-6 h-6 text-xs font-mono font-semibold rounded ${
                    showCorrect
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                  aria-hidden="true"
                >
                  {showCorrect ? '✓' : LETTERS[i]}
                </span>
                <span className="flex-1">{opt}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-5 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
        <span aria-live="polite" aria-atomic="true">
          {index + 1} / {SAMPLES.length}
        </span>
        <span>Auto-rotating · pick a quiz to take it for real</span>
      </div>
    </div>
  );
}
