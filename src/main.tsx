import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App/App.tsx'
import { tryLoadAndStartRecorder } from '@alwaysmeticulous/recorder-loader'
import './index.css'

async function startApp() {
    // Record all sessions on localhost, staging stacks and preview URLs
    if (!isProduction()) {
      // Start the Meticulous recorder before you initialise your app.
      // Note: all errors are caught and logged, so no need to surround with try/catch
      await tryLoadAndStartRecorder({
        projectId: 'ndttclXOwyjwXnr6acjYBOu8hr3sT18UD4wiRJHd',
      });
    }

    // Initalise app after the Meticulous recorder is ready, e.g.
    ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )
}

function isProduction() {
    // TODO: Update me with your production hostname
    return window.location.hostname !== 'pylae-33.vercel.app';
}

startApp();
