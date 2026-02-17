// src/app/router/public.routes.tsx
import { type RouteObject, Navigate } from 'react-router-dom';
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
import { LoansView } from '../../pages/admin/loans/LoansView.page';

// Marketplace
import MarketplacePage from '../../pages/marketplace/Marketplace.page';
import AssetDetailsPage from '../../pages/marketplace/asset/AssetDetails.page';
import AuctionDetailsPage from '../../pages/marketplace/auction/AuctionDetails.page';

// import SecondaryMarketplacePage from '../../pages/secondary-marketplace/P2PTesting';
import TradingEnginePage from '../../pages/secondary-marketplace/TradingEngine.page';

// Portfolio
import PortfolioPage from '../../pages/portfolio/Portfolio.page';
import FaucetPage from '../../pages/faucet/Faucet.page';

// 404 Page
import { NotFoundPage } from '../../components/ui/404-page-not-found';
import AboutPage from '../../pages/landing/About.page';
import ChangelogPage from '../../pages/landing/Changelog.page';
import FAQSection from '../../pages/landing/FAQ.page';
import BorrowPage from '../../pages/borrow/BorrowPage';

// Network & Layout
import { NetworkProvider } from '../providers/NetworkProvider';
import { NetworkLayout } from '../layouts/NetworkLayout';
import { FeatureGuard } from '../../components/common/FeatureGuard';

export const publicRoutes: RouteObject[] = [
  {
    path: '/',
    element: <Navigate to="/mantle" replace />,
  },
  {
    path: '/:network',
    element: (
      <NetworkProvider>
        <NetworkLayout />
      </NetworkProvider>
    ),
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'how-it-works',
        element: <FAQSection />,
      },
      {
        path: 'about',
        element: <AboutPage />,
      },
      {
        path: 'Changelog',
        element: <ChangelogPage />,
      },
      {
        path: 'marketplace',
        element: <MarketplacePage />,
      },
      {
        path: 'borrow',
        element: (
          <FeatureGuard feature="borrow">
            <BorrowPage />
          </FeatureGuard>
        ),
      },
      {
        path: 'marketplace/asset/:assetId',
        element: <AssetDetailsPage />,
      },
      {
        path: 'marketplace/auction/:assetId',
        element: <AuctionDetailsPage />,
      },
      {
        path: 'trade/asset/:assetId',
        element: (
          <FeatureGuard feature="secondaryMarket">
            <TradingEnginePage />
          </FeatureGuard>
        ),
      },
      {
        path: 'portfolio',
        element: <PortfolioPage />,
      },
      {
        path: 'faucet',
        element: (
          <FeatureGuard feature="faucet">
            <FaucetPage />
          </FeatureGuard>
        ),
      },
      {
        path: 'auth',
        element: <AuthPage />,
      },
      {
        path: 'adminAuth',
        element: <AdminAuthPage />,
      },
      {
        path: 'onboarding',
        element: <IssuerOnboardingPage />,
      },
      {
        path: 'issuer/dashboard',
        element: <IssuerDashboardPage />,
      },
      {
        path: 'issuer/asset/:assetId',
        element: <AssetDetailsWrapper />,
      },
      // Admin Dashboard Routes
      {
        path: 'admin',
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
            path: 'loans',
            element: <LoansView />,
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
    ],
  },
  // Legacy Redirects
  { path: '/marketplace', element: <Navigate to="/mantle/marketplace" replace /> },
  { path: '/auth', element: <Navigate to="/mantle/auth" replace /> },
  { path: '/portfolio', element: <Navigate to="/mantle/portfolio" replace /> },
  { path: '/admin', element: <Navigate to="/mantle/admin" replace /> },
  { path: '/trade/*', element: <Navigate to="/mantle/trade" replace /> },
  { path: '/faucet', element: <Navigate to="/mantle/faucet" replace /> },
  { path: '/borrow', element: <Navigate to="/mantle/borrow" replace /> },

  // 404 - Catch all unmatched routes
  {
    path: '*',
    element: <NotFoundPage />,
  },
];
