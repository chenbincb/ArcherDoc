import React from 'react';
import ReactDOM from 'react-dom/client';
import AppRouter from './AppRouter';
import { SettingsProvider } from './contexts/SettingsContext';
import { ProcessProvider } from './contexts/ProcessContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <SettingsProvider>
      <ProcessProvider>
        <AppRouter />
      </ProcessProvider>
    </SettingsProvider>
  </React.StrictMode>
);
