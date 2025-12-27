import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { TimerProvider } from './features/timer/hooks/TimerContext'
import { ThemeProvider } from './contexts/ThemeContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <TimerProvider>
        <App />
      </TimerProvider>
    </ThemeProvider>
  </React.StrictMode>,
)

