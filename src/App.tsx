// src/App.tsx
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import { WalletProvider } from './app/providers/WalletProvider';


function App() {
  return (
    <WalletProvider>
      <RouterProvider router={router} />
    </WalletProvider>
  );
}

export default App;