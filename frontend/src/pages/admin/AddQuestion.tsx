import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { addManualQuestion, getExtractionJob } from '../../api/client';
import { useAccessToken } from '../../hooks/useAccessToken';
import type { Law, Difficulty, ExtractionJob } from '../../types';

const LAWS: Law[] = [
  'Law 1',
  'Law 2',
  'Law 3',
  'Law 4',
  'Law 5',
  'Law 6',
  'Law 7',
  'Law 8',
  'Law 9',
  'Law 10',
  'Law 11',
  'Law 12',
  'Law 13',
  'Law 14',
  'Law 15',
  'Law 16',
  'Law 17',
];

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

export default function AddQuestion() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { getToken } = useAccessToken();

  const [job, setJob] = useState<ExtractionJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [text, setText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [explanation, setExplanation] = useState('');
  const [law, setLaw] = useState<Law>('Law 1');
  const [lawReference, setLawReference] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('');
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    async function loadJob() {
      if (!jobId) return;

      try {
        const token = await getToken();
        const data = await getExtractionJob(jobId, token);
        setJob(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load job');
      } finally {
        setLoading(false);
      }
    }

    loadJob();
  }, [jobId, getToken]);

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const resetForm = () => {
    setText('');
    setOptions(['', '', '', '']);
    setCorrectAnswer(0);
    setExplanation('');
    setLawReference('');
    setDifficulty('');
    setTagsInput('');
    // Keep the law selection for convenience when adding multiple questions
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!jobId) return;

    // Validation
    if (!text.trim()) {
      setError('Question text is required');
      return;
    }

    if (options.some((opt) => !opt.trim())) {
      setError('All four options are required');
      return;
    }

    if (!explanation.trim()) {
      setError('Explanation is required');
      return;
    }

    if (!lawReference.trim()) {
      setError('Law reference is required');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const tags = tagsInput
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag !== '');

      const token = await getToken();
      await addManualQuestion(
        jobId,
        {
          text: text.trim(),
          options: options.map((opt) => opt.trim()),
          correctAnswer,
          explanation: explanation.trim(),
          law,
          lawReference: lawReference.trim(),
          difficulty: difficulty || undefined,
          tags: tags.length > 0 ? tags : undefined,
        },
        token
      );

      setSuccess('Question added successfully!');
      resetForm();

      // Update local job count
      if (job) {
        setJob({
          ...job,
          totalQuestions: job.totalQuestions + 1,
          approvedCount: job.approvedCount + 1,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add question');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-700">{error || 'Job not found'}</p>
        <Link to="/admin/jobs" className="mt-4 inline-block btn-secondary">
          Back to Jobs
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <Link
          to={`/admin/jobs/${jobId}`}
          className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block"
        >
          ← Back to {job.fileName}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Add Question</h1>
        <p className="text-gray-600">
          Adding to: <span className="font-medium">{job.fileName}</span>
          <span className="ml-2 text-sm">({job.totalQuestions} questions)</span>
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-700">{success}</p>
            </div>
          )}

          {/* Question Text */}
          <div>
            <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-1">
              Question Text *
            </label>
            <textarea
              id="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter the question text..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={submitting}
            />
          </div>

          {/* Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Answer Options *</label>
            <div className="space-y-3">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="correctAnswer"
                    checked={correctAnswer === index}
                    onChange={() => setCorrectAnswer(index)}
                    className="w-4 h-4 text-primary-600"
                    disabled={submitting}
                  />
                  <span className="w-6 text-sm font-medium text-gray-500">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + index)}`}
                    className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      correctAnswer === index ? 'border-green-300 bg-green-50' : 'border-gray-300'
                    }`}
                    disabled={submitting}
                  />
                  {correctAnswer === index && (
                    <span className="text-green-600 text-sm font-medium">Correct</span>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Select the radio button next to the correct answer
            </p>
          </div>

          {/* Explanation */}
          <div>
            <label htmlFor="explanation" className="block text-sm font-medium text-gray-700 mb-1">
              Explanation *
            </label>
            <textarea
              id="explanation"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Explain why this is the correct answer..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={submitting}
            />
          </div>

          {/* Law and Reference */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="law" className="block text-sm font-medium text-gray-700 mb-1">
                Law *
              </label>
              <select
                id="law"
                value={law}
                onChange={(e) => setLaw(e.target.value as Law)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={submitting}
              >
                {LAWS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="lawReference"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Law Reference *
              </label>
              <input
                type="text"
                id="lawReference"
                value={lawReference}
                onChange={(e) => setLawReference(e.target.value)}
                placeholder="e.g., Law 12.1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={submitting}
              />
            </div>
          </div>

          {/* Difficulty and Tags */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">
                Difficulty (optional)
              </label>
              <select
                id="difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty | '')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={submitting}
              >
                <option value="">Not specified</option>
                {DIFFICULTIES.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                Tags (optional)
              </label>
              <input
                type="text"
                id="tags"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g., offside, VAR, penalty"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={submitting}
              />
              <p className="mt-1 text-xs text-gray-500">Comma-separated list of tags</p>
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t">
            <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
              {submitting ? 'Adding...' : 'Add Question'}
            </button>
            <Link to={`/admin/jobs/${jobId}`} className="btn-secondary">
              Done Adding
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
