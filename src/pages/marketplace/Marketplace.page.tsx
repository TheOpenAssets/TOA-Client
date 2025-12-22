// src/pages/marketplace/Marketplace.page.tsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  TrendingUp,
  TrendingDown,
  Grid3x3,
  List,
  ChevronDown,
} from 'lucide-react';
import {
  platformMetrics,
  marketplaceAssets,
  getFeaturedAssets,
  getHighYieldAssets,
  getRecentlyVerifiedAssets,
  formatCurrency,
  getCategoryIcon,
} from '../../lib/data/marketplace-mock-data';
import type { FilterCategory, SortOption, MarketplaceAsset } from '../../types/marketplace.types';
import Hero from '../../components/landing/Hero';
import HeroBackground from '../landing/HeroBackground';

const MarketplacePage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [sortBy, setSortBy] = useState<SortOption>('most-popular');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const featuredAssets = getFeaturedAssets();
  const highYieldAssets = getHighYieldAssets();
  const recentlyVerifiedAssets = getRecentlyVerifiedAssets();

  // Filter assets based on active filter and search
  const filteredAssets = marketplaceAssets.filter((asset) => {
    // Search filter
    const matchesSearch =
      asset.assetId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.description.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Category filter
    if (activeFilter === 'all') return true;
    if (activeFilter === 'invoices') return asset.category === 'invoice';
    if (activeFilter === 'real-estate') return asset.category === 'real-estate';
    if (activeFilter === 'trade-finance') return asset.category === 'trade-finance';
    if (activeFilter === 'equipment-lease') return asset.category === 'equipment-lease';
    if (activeFilter === 'high-yield') return asset.yieldAPY >= 10;
    if (activeFilter === 'short-term') return asset.maturityDays <= 180;
    if (activeFilter === 'verified') return asset.verified;

    return true;
  });

  const filters: { value: FilterCategory; label: string }[] = [
    { value: 'all', label: 'All Assets' },
    { value: 'invoices', label: 'Invoices' },
    { value: 'real-estate', label: 'Real Estate' },
    { value: 'trade-finance', label: 'Trade Finance' },
    { value: 'equipment-lease', label: 'Equipment Lease' },
    { value: 'high-yield', label: 'High Yield (>10%)' },
    { value: 'short-term', label: 'Short Term (<6mo)' },
    { value: 'verified', label: 'Verified' },
  ];

  const formatMaturity = (days: number): string => {
    if (days < 30) return `${days} days`;
    if (days < 365) return `${Math.floor(days / 30)} months`;
    return `${Math.floor(days / 365)} years`;
  };

  return (
    <div className="min-h-screen bg-[#f6fbff]">
      <HeroBackground />
      {/* Top Navigation Bar */}
      <header className="bg-transparent border-b border-gray-200 z-40 relative">
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Logo + Search */}
            <div className="flex items-center gap-6">
              {/* Logo */}
              <div className="flex items-center">
                <div className="w-8 h-8 bg-foreground rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">@</span>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative w-[400px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search assets"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg font-antic text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Center: Navigation */}
            <nav className="flex items-center gap-8">
              <button className="font-antic text-sm font-medium text-foreground hover:text-blue-600 transition-colors">
                Explore
              </button>
              <button className="font-antic text-sm font-medium text-foreground/70 hover:text-blue-600 transition-colors">
                Tools
              </button>
              <button className="font-antic text-sm font-medium text-foreground/70 hover:text-blue-600 transition-colors">
                Learn
              </button>
            </nav>

            {/* Right: Auth Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/auth')}
                className="px-6 py-2 bg-white border border-gray-300 rounded-lg font-antic text-sm font-medium text-foreground hover:bg-gray-50 transition-colors"
              >
                Sign Up / Log In
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Platform Metrics Strip */}
      <div className="bg-transparent relative border-b border-gray-200 z-40">
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          <div className="flex items-center gap-8 overflow-x-auto">
            {/* Metric 1: Total Assets Issued */}
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="font-antic text-xs text-gray-500">Total Assets Issued</span>
              <span className="font-antic text-sm font-semibold text-foreground">
                {platformMetrics.totalAssetsIssued} Assets
              </span>
              <span className="flex items-center gap-1 text-green-600">
                <TrendingUp className="w-3 h-3" />
                <span className="font-antic text-xs">{platformMetrics.totalAssetsChange}</span>
              </span>
            </div>

            {/* Metric 2: Average Platform Yield */}
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="font-antic text-xs text-gray-500">Average Platform Yield</span>
              <span className="font-antic text-sm font-semibold text-foreground">
                {platformMetrics.averageYield}% APY
              </span>
              <span className="flex items-center gap-1 text-green-600">
                <TrendingUp className="w-3 h-3" />
                <span className="font-antic text-xs">{platformMetrics.averageYieldChange}%</span>
              </span>
            </div>

            {/* Metric 3: Total Value Tokenized */}
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="font-antic text-xs text-gray-500">Total Value Tokenized</span>
              <span className="font-antic text-sm font-semibold text-foreground">
                ${platformMetrics.totalValueTokenized}M
              </span>
              <span className="flex items-center gap-1 text-green-600">
                <TrendingUp className="w-3 h-3" />
                <span className="font-antic text-xs">{platformMetrics.totalValueChange}%</span>
              </span>
            </div>

            {/* Metric 4: Active Investors */}
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="font-antic text-xs text-gray-500">Active Investors</span>
              <span className="font-antic text-sm font-semibold text-foreground">
                {platformMetrics.activeInvestors.toLocaleString()}
              </span>
              <span className="flex items-center gap-1 text-green-600">
                <TrendingUp className="w-3 h-3" />
                <span className="font-antic text-xs">{platformMetrics.activeInvestorsChange}</span>
              </span>
            </div>

            {/* Metric 5: Settlements Completed */}
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="font-antic text-xs text-gray-500">Settlements Completed (30d)</span>
              <span className="font-antic text-sm font-semibold text-foreground">
                {platformMetrics.settlementsCompleted.toLocaleString()}
              </span>
              <span className="flex items-center gap-1 text-green-600">
                <TrendingUp className="w-3 h-3" />
                <span className="font-antic text-xs">{platformMetrics.settlementsChange}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto px-6 py-8 z-40 bg-transparent relative" >
        {/* Three Feature Sections */}
        <div className="grid grid-cols-3 gap-12 mb-12 p-7 rounded-2xl "  >
          {/* Section 1: Featured Issuances */}
          <div className="bg-transparent">
            <div className="flex items-center gap-3 mb-6">
              <h2 className=" text-2xl font-bold text-foreground font-antic">
                Featured Issuances
              </h2>
            </div>
            <div className="border-t border-gray-200">
              {featuredAssets.map((asset, index) => (
                <div key={asset.id}>
                  <div className="py-6 hover:bg-gray-50 hover:p-6 cursor-pointer transition-colors">
                    <div className="flex items-center justify-between">
                      {/* Left: Icon + Asset Info */}
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16  rounded-full flex items-center justify-center text-2xl flex-shrink-0">
                          {getCategoryIcon(asset.category)}
                        </div>
                        <div>
                          <div className="font-antic text-lg font-bold text-foreground mb-1">
                            {asset.assetId}
                          </div>
                          <div className="font-antic text-sm text-gray-500">
                            {asset.name}
                          </div>
                        </div>
                      </div>

                      {/* Right: Price + Yield */}
                      <div className="text-right">
                        <div className="font-antic text-lg font-bold text-foreground mb-1">
                          ${asset.tokenPrice.toFixed(2)}
                        </div>
                        <div className="flex items-center justify-end gap-1 text-green-600">
                          <TrendingUp className="w-4 h-4" />
                          <span className="font-antic text-sm font-medium">
                            {asset.yieldAPY}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {index < featuredAssets.length - 1 && (
                    <div className="border-t border-gray-200"></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: High-Yield Opportunities */}
          <div className="bg-transparent">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="font-antic text-2xl font-bold text-foreground">
                High-Yield Opportunities
              </h2>
            </div>
            <div className="border-t border-gray-200">
              {highYieldAssets.map((asset, index) => (
                <div key={asset.id}>
                  <div className="py-6 hover:bg-gray-50 hover:p-6 cursor-pointer transition-colors">
                    <div className="flex items-center justify-between">
                      {/* Left: Icon + Asset Info */}
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16  rounded-full flex items-center justify-center text-2xl flex-shrink-0">
                          {getCategoryIcon(asset.category)}
                        </div>
                        <div>
                          <div className="font-antic text-lg font-bold text-foreground mb-1">
                            {asset.assetId}
                          </div>
                          <div className="font-antic text-sm text-gray-500">
                            {asset.description}
                          </div>
                        </div>
                      </div>

                      {/* Right: Price + Yield */}
                      <div className="text-right">
                        <div className="font-antic text-lg font-bold text-foreground mb-1">
                          ${formatCurrency(asset.tokenPrice)}
                        </div>
                        <div className="flex items-center justify-end gap-1 text-green-600">
                          <TrendingUp className="w-4 h-4" />
                          <span className="font-antic text-sm font-semibold">
                            {asset.yieldAPY}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {index < highYieldAssets.length - 1 && (
                    <div className="border-t border-gray-200"></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Recently Verified Assets */}
          <div className="bg-transparent">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="font-antic text-2xl font-bold text-foreground">
                Recently Verified
              </h2>
            </div>
            <div className="border-t border-gray-200">
              {recentlyVerifiedAssets.map((asset, index) => (
                <div key={asset.id}>
                  <div className="py-6 hover:bg-gray-50 hover:p-6 cursor-pointer transition-colors">
                    <div className="flex items-center justify-between">
                      {/* Left: Icon + Asset Info */}
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16  rounded-full flex items-center justify-center text-2xl flex-shrink-0">
                          {getCategoryIcon(asset.category)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-antic text-lg font-bold text-foreground">
                              {asset.assetId}
                            </span>
                            {asset.verified && (
                              <span className="text-green-600 font-bold">✓</span>
                            )}
                          </div>
                          <div className="font-antic text-sm text-gray-500">
                            {asset.description}
                          </div>
                        </div>
                      </div>

                      {/* Right: Price */}
                      <div className="text-right">
                        <div className="font-antic text-lg font-bold text-foreground">
                          ${asset.tokenPrice.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                  {index < recentlyVerifiedAssets.length - 1 && (
                    <div className="border-t border-gray-200"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Assets Table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-antic text-xl font-semibold text-foreground">Explore Assets</h2>
            </div>

            {/* Filters and Controls */}
            <div className="flex items-center justify-between">
              {/* Filter Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto">
                {filters.map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setActiveFilter(filter.value)}
                    className={`px-4 py-2 rounded-lg font-antic text-sm font-medium whitespace-nowrap transition-colors ${
                      activeFilter === filter.value
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              {/* View Controls */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded ${
                      viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded ${
                      viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg font-antic text-sm font-medium text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="most-popular">Most Popular</option>
                  <option value="highest-yield">Highest Yield</option>
                  <option value="newest">Newest</option>
                  <option value="lowest-price">Lowest Price</option>
                  <option value="ending-soon">Ending Soon</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-6 py-3 text-left font-antic text-xs font-medium text-gray-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-6 py-3 text-left font-antic text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Asset Name
                  </th>
                  <th className="px-6 py-3 text-right font-antic text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Token Price
                  </th>
                  <th className="px-6 py-3 text-right font-antic text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Yield
                  </th>
                  <th className="px-6 py-3 text-right font-antic text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Maturity
                  </th>
                  <th className="px-6 py-3 text-right font-antic text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Raised
                  </th>
                  <th className="px-6 py-3 text-right font-antic text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Funding Progress
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map((asset, index) => (
                  <tr
                    key={asset.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    }`}
                  >
                    {/* Row Number */}
                    <td className="px-6 py-4 font-antic text-sm text-gray-500">{index + 1}</td>

                    {/* Asset Name */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-lg flex-shrink-0">
                          {getCategoryIcon(asset.category)}
                        </div>
                        <div>
                          <div className="font-antic text-sm font-semibold text-foreground">
                            {asset.assetId}
                          </div>
                          <div className="font-antic text-xs text-gray-500">{asset.name}</div>
                        </div>
                      </div>
                    </td>

                    {/* Token Price */}
                    <td className="px-6 py-4 text-right">
                      <div className="font-antic text-sm font-semibold text-foreground">
                        ${asset.tokenPrice.toFixed(2)}
                      </div>
                    </td>

                    {/* Yield */}
                    <td className="px-6 py-4 text-right">
                      <div className="font-antic text-sm text-foreground">
                        {asset.yieldAPY}% APY
                      </div>
                    </td>

                    {/* Maturity */}
                    <td className="px-6 py-4 text-right">
                      <div className="font-antic text-sm text-gray-600">
                        {formatMaturity(asset.maturityDays)}
                      </div>
                    </td>

                    {/* Total Raised */}
                    <td className="px-6 py-4 text-right">
                      <div className="font-antic text-sm text-foreground">
                        {formatCurrency(asset.totalRaised)} / {formatCurrency(asset.targetAmount)}
                      </div>
                      <div className="font-antic text-xs text-gray-500">
                        ({asset.fundingProgress}% funded)
                      </div>
                    </td>

                    {/* Funding Progress Bar */}
                    <td className="px-6 py-4">
                      <div className="w-full h-8 bg-gray-200 rounded-lg overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center transition-all duration-300"
                          style={{ width: `${asset.fundingProgress}%` }}
                        >
                          <span className="font-antic text-xs font-medium text-white">
                            {asset.fundingProgress}%
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketplacePage;
