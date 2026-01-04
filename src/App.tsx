// src/App.tsx
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { router } from './app/router';
import { WalletProvider } from './app/providers/WalletProvider';


function App() {
  return (
    <WalletProvider>
      <Toaster position="top-right" toastOptions={{ className: 'font-geist font-medium' }} />
      <RouterProvider router={router} />
    </WalletProvider>
  );
}

export default App;