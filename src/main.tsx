import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App'
import { setupFetchInterceptor } from './lib/utils/fetch-interceptor'

// Setup global fetch interceptor to handle 401 Unauthorized errors
setupFetchInterceptor();

// Clear stale wagmi state if it contains a chain that no longer matches the
// active default network.  This forces wagmi to re-default to the correct chain
// on the next load instead of silently signing on the old one.
// Chains that were previously used as defaults: 5003 (Mantle Sepolia), 421614 (Arbitrum Sepolia).
const STALE_CHAIN_IDS = new Set([5003, 421614]);
try {
  const wagmiStore = localStorage.getItem('wagmi.store');
  if (wagmiStore) {
    const parsed = JSON.parse(wagmiStore);
    if (STALE_CHAIN_IDS.has(parsed?.state?.chainId)) {
      localStorage.removeItem('wagmi.store');
      console.log('🧹 Cleared stale wagmi chain state (chainId:', parsed.state.chainId, ')');
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
