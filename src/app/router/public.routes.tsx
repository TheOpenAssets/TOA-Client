// src/app/router/public.routes.tsx
import { type RouteObject } from 'react-router-dom';
import HomePage from '../../pages/landing/Home.page';
import AuthPage from '../../pages/public/auth/Auth.page';
import AdminAuthPage from '../../pages/public/auth/adminAuth.page';
import IssuerOnboardingPage from '../../pages/public/onboarding/IssuerOnboarding.page';
import IssuerDashboardPage from '../../pages/issuer/dashboard/IssuerDashboard.page';
import AssetDetailsWrapper from '../../pages/issuer/asset-details/AssetDetailsWrapper.page';

// Admin Dashboard Imports
import AdminLayout from '../../pages/admin/layout/AdminLayout.page';
import AdminOverviewPage from '../../pages/admin/overview/AdminOverview.page';
import ComplianceViewPage from '../../pages/admin/compliance/ComplianceView.page';
import OperationsViewPage from '../../pages/admin/operations/OperationsView.page';
import PayoutViewPage from '../../pages/admin/payout/PayoutView.page';
import SettlementViewPage from '../../pages/admin/settlements/SettlementView.page';
import ListingsPage from '../../pages/admin/listings/Listings.page';

// Component Showcase
import ComponentShowcasePage from '../../pages/examples/ComponentShowcase.page';

// Marketplace
import MarketplacePage from '../../pages/marketplace/Marketplace.page';
import AssetDetailsPage from '../../pages/marketplace/asset/AssetDetails.page';
import AuctionDetailsPage from '../../pages/marketplace/auction/AuctionDetails.page';
import BorrowPage from '../../pages/app/borrow/Borrow.page';

// Portfolio
import PortfolioPage from '../../pages/portfolio/Portfolio.page';
import FaucetPage from '../../pages/faucet/Faucet.page';

// 404 Page
import { NotFoundPage } from '../../components/ui/404-page-not-found';

// Challenge Verification Page
import { ChallengeVerificationPage } from '../../components/ui/challenge-verification';

export const publicRoutes: RouteObject[] = [
  {
    path: '/',
    element: <HomePage />,
  },
  
  {
    path: '/marketplace',
    element: <MarketplacePage />,
  },
  {
    path: '/marketplace/asset/:assetId',
    element: <AssetDetailsPage />,
  },
  {
    path: '/marketplace/auction/:assetId',
    element: <AuctionDetailsPage />,
  },
  {
    path: '/borrow',
    element: <BorrowPage />,
  },
  {
    path: '/portfolio',
    element: <PortfolioPage />,
  },
  {
    path: '/faucet',
    element: <FaucetPage />,
  },
  {
    path: '/auth',
    element: <AuthPage />,
  },
  {
    path: '/adminAuth',
    element: <AdminAuthPage />,
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
  // Admin Dashboard Routes
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      {
        index: true,
        element: <AdminOverviewPage />,
      },
      {
        path: 'listings',
        element: <ListingsPage />,
      },
      {
        path: 'compliance',
        element: <ComplianceViewPage />,
      },
      {
        path: 'operations',
        element: <OperationsViewPage />,
      },
      {
        path: 'payouts',
        element: <PayoutViewPage />,
      },
      {
        path: 'settlements',
        element: <SettlementViewPage />,
      },
    ],
  },
  // Component Showcase
  {
    path: '/showcase',
    element: <ComponentShowcasePage />,
  },
  // Challenge Verification
  {
    path: '/verify-challenge',
    element: <ChallengeVerificationPage />,
  },
  // 404 - Catch all unmatched routes
  {
    path: '*',
    element: <NotFoundPage />,
  },
];
