import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';

function Result() {
  const { jobId } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let intervalId;

    const fetchResult = async () => {
      try {
        const response = await api.get(`/results/${jobId}`);
        const data = response.data;

        if (data.status === 'completed' && data.report) {
          setResult({
            url: data.report.url,
            status: data.status,
            score: Math.round(data.report.overallScore || 0),
            recommendations: data.report.recommendations || []
          });
          setLoading(false);
          clearInterval(intervalId);
        } else if (data.status === 'failed' || data.status === 'error') {
          setError('Analysis failed.');
          setLoading(false);
          clearInterval(intervalId);
        }
        // If processing, keep loading and polling
      } catch (err) {
        console.error('Error fetching result:', err);
        setError('Failed to fetch results.');
        setLoading(false);
        if (intervalId) clearInterval(intervalId);
      }
    };

    // Initial fetch
    fetchResult();

    // Poll every 3 seconds
    intervalId = setInterval(fetchResult, 3000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [jobId]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary to-secondary p-4">
      <div className="glass w-full max-w-2xl p-8">
        <h1 className="mb-6 text-center text-3xl font-bold text-white">SEO Analysis Result</h1>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent"></div>
            <p className="mt-4 text-white">Analyzing your website...</p>
            <p className="text-sm text-gray-200">Job ID: {jobId}</p>
          </div>
        ) : error ? (
          <div className="text-center">
            <p className="mb-4 text-red-400">{error}</p>
            <Link to="/" className="inline-block rounded bg-primary px-6 py-2 font-semibold text-white transition-colors hover:bg-primary/80">
              Try Again
            </Link>
          </div>
        ) : (
          <div className="space-y-6 text-white">
            <div className="flex items-center justify-between border-b border-white/20 pb-4">
              <div>
                <h2 className="text-xl font-semibold">Overall Score</h2>
                <p className="text-gray-200">{result?.url}</p>
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-2xl font-bold">
                {result?.score}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-lg font-semibold">Recommendations</h3>
              <ul className="list-inside list-disc space-y-2 text-gray-100">
                {result?.recommendations?.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>

            <div className="mt-8 text-center">
              <Link to="/" className="inline-block rounded bg-primary px-6 py-2 font-semibold text-white transition-colors hover:bg-primary/80">
                Analyze Another URL
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Result;
