import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { TimerProvider } from './features/timer/hooks/TimerContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { AccentModeProvider } from './contexts/AccentModeContext'
import { TrophySystemProvider } from './contexts/TrophySystemContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <AccentModeProvider>
        <TrophySystemProvider>
          <TimerProvider>
            <App />
          </TimerProvider>
        </TrophySystemProvider>
      </AccentModeProvider>
    </ThemeProvider>
  </React.StrictMode>,
)

