import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App'
import { setupFetchInterceptor } from './lib/utils/fetch-interceptor'

// Setup global fetch interceptor to handle 401 Unauthorized errors
setupFetchInterceptor();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
