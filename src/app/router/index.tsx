// src/app/router/index.tsx
import { createBrowserRouter } from 'react-router-dom';
import { publicRoutes } from './public.routes';

export const router = createBrowserRouter([...publicRoutes]);