import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createManualJob } from '../../api/client';
import { useAccessToken } from '../../hooks/useAccessToken';

const CATEGORIES = [
  'Laws of the Game',
  'Practical Refereeing',
  'Offside',
  'Fouls and Misconduct',
  'Set Pieces',
  'General Knowledge',
];

export default function CreateQuiz() {
  const navigate = useNavigate();
  const { getToken } = useAccessToken();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Laws of the Game');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const response = await createManualJob(
        {
          title: title.trim(),
          description: description.trim() || undefined,
          category,
        },
        token
      );

      // Navigate to the job detail page to add questions
      navigate(`/admin/jobs/${response.jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create quiz');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <Link to="/admin" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
          ← Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Create Manual Quiz</h1>
        <p className="text-gray-600">Create a new quiz and add questions manually</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Quiz Title *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Law 12 - Fouls and Misconduct"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of what this quiz covers..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={loading}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-4">
            <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
              {loading ? 'Creating...' : 'Create Quiz'}
            </button>
            <Link to="/admin" className="btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
