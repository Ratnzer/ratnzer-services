import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; 
import { ErrorBoundary } from './components/ErrorBoundary';

// ✅ Catch global unhandled errors (outside React)
window.onerror = function(message, source, lineno, colno, error) {
  console.error("Global Error Caught:", error);
  // This will be caught by ErrorBoundary if it happens during render
};

window.onunhandledrejection = function(event) {
  console.error("Unhandled Promise Rejection:", event.reason);
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
