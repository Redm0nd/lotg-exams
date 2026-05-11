import { useState } from 'react';
import { updateQuestion } from '../../api/client';
import { useAccessToken } from '../../hooks/useAccessToken';
import type { BankQuestion, Law } from '../../types';

const LAWS: Law[] = [
  'Law 1', 'Law 2', 'Law 3', 'Law 4', 'Law 5', 'Law 6', 'Law 7', 'Law 8', 'Law 9',
  'Law 10', 'Law 11', 'Law 12', 'Law 13', 'Law 14', 'Law 15', 'Law 16', 'Law 17',
];

interface QuestionEditorProps {
  question: BankQuestion;
  onSaved: (updated: BankQuestion) => void;
  onCancel: () => void;
}

export default function QuestionEditor({ question, onSaved, onCancel }: QuestionEditorProps) {
  const { getToken } = useAccessToken();
  const [text, setText] = useState(question.text);
  const [options, setOptions] = useState<string[]>(() => [...question.options]);
  const [correctAnswer, setCorrectAnswer] = useState(question.correctAnswer);
  const [explanation, setExplanation] = useState(question.explanation ?? '');
  const [law, setLaw] = useState<Law>(question.law);
  const [lawReference, setLawReference] = useState(question.lawReference ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setOption = (index: number, value: string) => {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  };

  const addOption = () => {
    if (options.length >= 8) return;
    setOptions((prev) => [...prev, '']);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== index));
    // Keep correctAnswer pointing at the same option after removal.
    if (correctAnswer === index) {
      setCorrectAnswer(0);
    } else if (correctAnswer > index) {
      setCorrectAnswer(correctAnswer - 1);
    }
  };

  const handleSave = async () => {
    setError(null);

    if (!text.trim()) {
      setError('Question text is required');
      return;
    }
    if (options.some((o) => !o.trim())) {
      setError('All options must be filled in');
      return;
    }
    if (correctAnswer < 0 || correctAnswer >= options.length) {
      setError('Pick which option is correct');
      return;
    }
    if (!lawReference.trim()) {
      setError('Law reference is required');
      return;
    }

    setSaving(true);
    try {
      const token = await getToken();
      await updateQuestion(
        question.questionId,
        {
          text: text.trim(),
          options: options.map((o) => o.trim()),
          correctAnswer,
          explanation: explanation.trim(),
          law,
          lawReference: lawReference.trim(),
        },
        token
      );
      onSaved({
        ...question,
        text: text.trim(),
        options: options.map((o) => o.trim()),
        correctAnswer,
        explanation: explanation.trim(),
        law,
        lawReference: lawReference.trim(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-amber-900">Editing question</h3>
        <span className="text-xs font-mono text-amber-700">{question.questionId}</span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Question text</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-medium text-gray-700">
            Options (pick the radio next to the correct answer)
          </label>
          <button
            type="button"
            onClick={addOption}
            disabled={options.length >= 8}
            className="text-xs text-primary-700 hover:underline disabled:opacity-40 disabled:no-underline"
          >
            + Add option
          </button>
        </div>
        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={`correct-${question.questionId}`}
                  checked={correctAnswer === i}
                  onChange={() => setCorrectAnswer(i)}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="text-xs font-mono text-gray-500 w-4">
                  {String.fromCharCode(65 + i)}
                </span>
              </label>
              <input
                type="text"
                value={opt}
                onChange={(e) => setOption(i, e.target.value)}
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => removeOption(i)}
                disabled={options.length <= 2}
                className="text-xs text-red-600 hover:text-red-800 disabled:opacity-40 disabled:cursor-not-allowed px-2"
                aria-label="Remove option"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-1">
          <label className="block text-xs font-medium text-gray-700 mb-1">Law</label>
          <select
            value={law}
            onChange={(e) => setLaw(e.target.value as Law)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500"
          >
            {LAWS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Law reference (e.g. Law 12.4)
          </label>
          <input
            type="text"
            value={lawReference}
            onChange={(e) => setLawReference(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Explanation</label>
        <textarea
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200">
        <button type="button" onClick={onCancel} className="btn-secondary text-sm">
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn-primary text-sm disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
