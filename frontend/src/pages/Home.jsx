// src/pages/Home.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function Home() {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setError('');
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/analyze', { url });
      const { jobId } = response.data;
      navigate(`/result/${jobId}`);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.errors?.[0]?.msg || 'Failed to submit URL');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary to-secondary p-4">
      <div className="glass w-full max-w-md p-8">
        <h1 className="mb-6 text-center text-3xl font-bold text-white">SEO Analyzer</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full rounded border border-gray-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-primary py-2 font-semibold text-white transition-colors hover:bg-primary/80 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Analyzing...' : 'Analyze'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Home;
