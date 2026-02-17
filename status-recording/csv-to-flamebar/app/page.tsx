'use client';

import { useEffect, useState, useRef } from 'react';
import HeapProfiler from '@/components/HeapProfiler';

export default function Page() {
  const [csvPath, setCsvPath] = useState('');
  const [csvContent, setCsvContent] = useState('');
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState('');
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch CSV from server
  const fetchCSV = async (path: string) => {
    if (!path.trim()) {
      setError('Please enter a file path');
      return;
    }

    setStatus('loading');
    setError('');

    try {
      const response = await fetch(
        `/api/csv?path=${encodeURIComponent(path)}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(
          data.error || 'Failed to fetch CSV'
        );
      }

      const data = await response.json();
      setCsvContent(data.data);
      setLastFetch(new Date(data.timestamp));
      setStatus('success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setStatus('error');
      console.error('[Page] CSV fetch error:', message);
    }
  };

  // Start polling
  const startPolling = async (path: string) => {
    if (!path.trim()) {
      setError('Please enter a file path');
      return;
    }

    // Initial fetch
    await fetchCSV(path);

    // Set up polling interval
    setIsPolling(true);
    pollIntervalRef.current = setInterval(() => {
      fetchCSV(path);
    }, 30000); // 30 seconds
  };

  // Stop polling
  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIsPolling(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#06060f', fontFamily: "'JetBrains Mono', monospace", color: '#ccc' }}>
      {/* Path Input Section */}
      <div style={{
        borderBottom: '1px solid #1a1a35',
        padding: '20px 28px',
        background: '#08080f'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{
              color: '#3a4a6a',
              fontSize: '10px',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              display: 'block',
              marginBottom: '8px'
            }}>
              CSV File Path
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
              <input
                type="text"
                value={csvPath}
                onChange={(e) => setCsvPath(e.target.value)}
                placeholder="/path/to/heap-profile.csv"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (isPolling) stopPolling();
                    else startPolling(csvPath);
                  }
                }}
                disabled={isPolling}
                style={{
                  flex: 1,
                  background: '#0d0d1a',
                  border: '1px solid #1e3a5f',
                  borderRadius: '6px',
                  color: '#ccc',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '12px',
                  padding: '10px 14px',
                  opacity: isPolling ? 0.6 : 1,
                  cursor: isPolling ? 'not-allowed' : 'text'
                }}
              />
              <button
                onClick={() => {
                  if (isPolling) {
                    stopPolling();
                  } else {
                    startPolling(csvPath);
                  }
                }}
                style={{
                  background: isPolling ? '#ff6b6b22' : '#00ff9f22',
                  border: `1px solid ${isPolling ? '#ff6b6b' : '#00ff9f'}`,
                  borderRadius: '6px',
                  color: isPolling ? '#ff6b6b' : '#00ff9f',
                  cursor: 'pointer',
                  fontSize: '11px',
                  padding: '10px 18px',
                  letterSpacing: '1px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap'
                }}
              >
                {isPolling ? '⏹ Stop Poll' : '▶ Start Poll'}
              </button>
            </div>
          </div>

          {/* Status Info */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginTop: '12px' }}>
            {isPolling && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#00ff9f',
                  animation: 'pulse 1s infinite'
                }} />
                <span style={{ fontSize: '11px', color: '#00ff9f', letterSpacing: '1px' }}>
                  POLLING ACTIVE (30s)
                </span>
              </div>
            )}

            {lastFetch && (
              <div style={{ fontSize: '10px', color: '#4a5a7a' }}>
                Last fetch: {lastFetch.toLocaleTimeString()}
              </div>
            )}

            {status === 'success' && csvContent && (
              <div style={{ fontSize: '10px', color: '#00ff9f' }}>
                ✓ {csvContent.split('\n').length - 1} rows loaded
              </div>
            )}

            {error && (
              <div style={{ fontSize: '10px', color: '#ff6b6b' }}>
                ✗ {error}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profiler Component */}
      <HeapProfiler csvContent={csvContent} />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
