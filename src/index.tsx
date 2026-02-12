import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

type DiagnosticEvent = {
  ts: string;
  type: 'error' | 'promise' | 'react';
  message: string;
  stack?: string;
};

const DIAG_STORAGE_KEY = 'ratnzer_runtime_diag_v1';

const readStoredEvents = (): DiagnosticEvent[] => {
  try {
    const raw = localStorage.getItem(DIAG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-20) : [];
  } catch {
    return [];
  }
};

const writeStoredEvents = (events: DiagnosticEvent[]) => {
  try {
    localStorage.setItem(DIAG_STORAGE_KEY, JSON.stringify(events.slice(-20)));
  } catch {
    // ignore storage issues
  }
};

const normalizeUnknownError = (value: unknown) => {
  if (value instanceof Error) {
    return { message: value.message || 'Unknown error', stack: value.stack };
  }

  if (typeof value === 'string') {
    return { message: value };
  }

  try {
    return { message: JSON.stringify(value) };
  } catch {
    return { message: String(value) };
  }
};

class RootErrorBoundary extends React.Component<
  { onReactCrash: (event: DiagnosticEvent) => void; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    const normalized = normalizeUnknownError(error);
    this.props.onReactCrash({
      ts: new Date().toISOString(),
      type: 'react',
      message: normalized.message,
      stack: normalized.stack,
    });
  }

  render() {
    return this.props.children as any;
  }
}

const RuntimeDiagnostics: React.FC = () => {
  const [events, setEvents] = useState<DiagnosticEvent[]>(() => readStoredEvents());
  const [visible, setVisible] = useState(true);

  const addEvent = (event: DiagnosticEvent) => {
    setEvents((prev) => {
      const next = [...prev, event].slice(-20);
      writeStoredEvents(next);
      return next;
    });
  };

  useEffect(() => {
    const onWindowError = (event: ErrorEvent) => {
      const normalized = normalizeUnknownError(event.error ?? event.message);
      addEvent({
        ts: new Date().toISOString(),
        type: 'error',
        message: normalized.message,
        stack: normalized.stack,
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const normalized = normalizeUnknownError(event.reason);
      addEvent({
        ts: new Date().toISOString(),
        type: 'promise',
        message: normalized.message,
        stack: normalized.stack,
      });
    };

    window.addEventListener('error', onWindowError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      window.removeEventListener('error', onWindowError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  return (
    <>
      <RootErrorBoundary onReactCrash={addEvent}>
        <App />
      </RootErrorBoundary>

      {visible && (
        <div
          style={{
            position: 'fixed',
            zIndex: 99999,
            bottom: 8,
            left: 8,
            right: 8,
            maxHeight: '45vh',
            overflow: 'auto',
            background: 'rgba(10, 10, 10, 0.92)',
            color: '#f8fafc',
            fontSize: 12,
            lineHeight: 1.4,
            border: '1px solid #334155',
            borderRadius: 8,
            padding: 8,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
            <strong>Runtime Diagnostics</strong>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => {
                  setEvents([]);
                  writeStoredEvents([]);
                }}
                style={{ background: '#334155', color: '#fff', border: 'none', borderRadius: 4, padding: '2px 8px' }}
              >
                Clear
              </button>
              <button
                onClick={() => setVisible(false)}
                style={{ background: '#7f1d1d', color: '#fff', border: 'none', borderRadius: 4, padding: '2px 8px' }}
              >
                Hide
              </button>
            </div>
          </div>

          {events.length === 0 ? (
            <div style={{ color: '#94a3b8' }}>No runtime errors captured yet.</div>
          ) : (
            events
              .slice()
              .reverse()
              .map((event, index) => (
                <div key={`${event.ts}-${index}`} style={{ borderTop: '1px solid #1e293b', paddingTop: 6, marginTop: 6 }}>
                  <div>
                    [{event.type}] {event.ts}
                  </div>
                  <div style={{ color: '#fda4af', whiteSpace: 'pre-wrap' }}>{event.message}</div>
                  {event.stack && (
                    <details>
                      <summary>stack</summary>
                      <pre style={{ whiteSpace: 'pre-wrap', color: '#cbd5e1' }}>{event.stack}</pre>
                    </details>
                  )}
                </div>
              ))
          )}
        </div>
      )}
    </>
  );
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <RuntimeDiagnostics />
  </React.StrictMode>
);
