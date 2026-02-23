import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App'
import { setupFetchInterceptor } from './lib/utils/fetch-interceptor'

// Setup global fetch interceptor to handle 401 Unauthorized errors
setupFetchInterceptor();

// Clear stale wagmi state if it contains the old Mantle Sepolia chain (5003).
// This forces wagmi to default to Arbitrum Sepolia on the next load.
try {
  const wagmiStore = localStorage.getItem('wagmi.store');
  if (wagmiStore) {
    const parsed = JSON.parse(wagmiStore);
    if (parsed?.state?.chainId === 5003) {
      localStorage.removeItem('wagmi.store');
      console.log('🧹 Cleared stale Mantle wagmi chain state');
    }
  }
} catch {
  // ignore parse errors
}

console.log('🚀 App starting...');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
