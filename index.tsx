import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { CoreProvider } from './context/CoreContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <CoreProvider>
      <App />
    </CoreProvider>
  </React.StrictMode>
);