// src/app/router/public.routes.tsx
import { type RouteObject } from 'react-router-dom';
import HomePage from '../../pages/landing/Home.page';
import AuthPage from '../../pages/public/auth/Auth.page';
import IssuerOnboardingPage from '../../pages/public/onboarding/IssuerOnboarding.page';
import IssuerDashboardPage from '../../pages/issuer/dashboard/IssuerDashboard.page';
import AssetDetailsWrapper from '../../pages/issuer/asset-details/AssetDetailsWrapper.page';

export const publicRoutes: RouteObject[] = [
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/auth',
    element: <AuthPage />,
  },
  {
    path: '/onboarding',
    element: <IssuerOnboardingPage />,
  },
  {
    path: '/issuer/dashboard',
    element: <IssuerDashboardPage />,
  },
  {
    path: '/issuer/asset/:assetId',
    element: <AssetDetailsWrapper />,
  },
];