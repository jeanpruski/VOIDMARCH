import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { SparkleTheme } from './SparkleTheme';
import '@fontsource-variable/dm-sans';
import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-600.css';
import '@fontsource/cormorant-garamond/latin-500-italic.css';
import './style.css';
import './sparkle-theme.css';
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <SparkleTheme />
  </React.StrictMode>,
);
