// src/App.tsx
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import { WalletProvider } from './app/providers/WalletProvider';
import { WalletIntegrityProvider } from './app/providers/WalletIntegrityProvider';
import './styles/heroBackground.css'


function App() {
  return (
    <WalletProvider>
      <WalletIntegrityProvider>
        <RouterProvider router={router} />
      </WalletIntegrityProvider>
    </WalletProvider>
  );
}

export default App;