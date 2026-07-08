import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './styles/app.css'
import './styles/templates.css'
import './styles/print.css'

// Top-level boundary: any runtime error shows a reload prompt instead
// of a white screen. Bilingual literal — i18n itself may be the crash.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary
      resetKey="app"
      message="页面出错了，请刷新重试 / Something went wrong — please refresh."
      retryLabel="重试 / Retry"
    >
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
