// src/app/router/public.routes.tsx
import { type RouteObject } from 'react-router-dom';
import HomePage from '../../pages/landing/Home.page';
import AuthPage from '../../pages/public/auth/Auth.page';

export const publicRoutes: RouteObject[] = [
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/auth',
    element: <AuthPage />,
  },
];