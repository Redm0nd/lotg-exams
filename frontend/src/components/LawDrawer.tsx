import { useEffect, useState } from 'react';

interface LawSection {
  title: string;
  text: string;
}

interface LawData {
  title: string;
  summary: string;
  sections: Record<string, LawSection>;
}

type LawsDatabase = Record<string, LawData>;

interface Props {
  lawReference: string;
  onClose: () => void;
}

function parseLawReference(ref: string): { lawNum: string; sectionNum: string | null } {
  // Handles: "Law 11", "Law 11.1", "Law 12.3 - Some title"
  const match = ref.match(/Law\s+(\d+)(?:\.(\d+))?/i);
  if (!match) return { lawNum: '', sectionNum: null };
  return { lawNum: match[1], sectionNum: match[2] ?? null };
}

export default function LawDrawer({ lawReference, onClose }: Props) {
  const [laws, setLaws] = useState<LawsDatabase | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/laws.json')
      .then((r) => r.json())
      .then(setLaws)
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const { lawNum, sectionNum } = parseLawReference(lawReference);
  const law = laws ? laws[lawNum] : null;
  const section = law && sectionNum ? law.sections[sectionNum] : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Law ${lawNum} reference`}
        className="fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-lg bg-white shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-blue-700 text-white flex-shrink-0">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide opacity-75">
              Laws of the Game
            </p>
            <h2 className="text-lg font-bold leading-tight">
              {law ? `Law ${lawNum}: ${law.title}` : lawReference}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-blue-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {error && (
            <p className="text-red-600 text-sm">Could not load law reference content.</p>
          )}

          {!laws && !error && (
            <p className="text-gray-500 text-sm animate-pulse">Loading…</p>
          )}

          {law && (
            <>
              {/* Highlighted section */}
              {section && (
                <div className="bg-blue-50 border-l-4 border-blue-600 rounded-r-lg p-4">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
                    {lawReference} — {section.title}
                  </p>
                  <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
                    {section.text}
                  </p>
                </div>
              )}

              {/* Law summary */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Overview</h3>
                <p className="text-sm text-gray-600">{law.summary}</p>
              </div>

              {/* Other sections */}
              {Object.entries(law.sections)
                .filter(([key]) => key !== sectionNum)
                .map(([key, sec]) => (
                  <div key={key} className="border-t pt-4">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      {lawNum}.{key} — {sec.title}
                    </h4>
                    <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                      {sec.text}
                    </p>
                  </div>
                ))}
            </>
          )}

          {laws && !law && (
            <p className="text-sm text-gray-600">
              No reference content available for <strong>{lawReference}</strong>.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t flex-shrink-0">
          <p className="text-xs text-gray-400">
            Source: IFAB Laws of the Game 2024/25.{' '}
            <a
              href="https://www.theifab.com/laws-of-the-game/overview/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              View full text at IFAB →
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
