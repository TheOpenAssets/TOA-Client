// src/App.tsx
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import "./styles/Herobackground.css";


function App() {
  return <RouterProvider router={router} />;
}

export default App;