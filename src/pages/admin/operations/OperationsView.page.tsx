// src/pages/admin/operations/OperationsView.page.tsx

import { useState } from 'react';
import {
  Network,
  Layers,
  CheckCircle2,
  ExternalLink,
  FileCode,
  Hash,
  ChevronRight,
} from 'lucide-react';
import { mockAdminAssets } from '../../../lib/data/admin-mock-data';
import type { AdminAsset } from '../../../types/admin.types';
import { Button } from '../../../components/ui/button';

const OperationsViewPage = () => {
  const [approvedAssets, setApprovedAssets] = useState(
    mockAdminAssets.filter((a) => a.status === 'COMPLIANCE_APPROVED')
  );
  const [registeredAssets, setRegisteredAssets] = useState(
    mockAdminAssets.filter((a) => a.status === 'REGISTERED')
  );
  const [tokenizedAssets] = useState(
    mockAdminAssets.filter((a) => a.status === 'TOKENIZED' || a.status === 'YIELDING')
  );

  const [selectedAsset, setSelectedAsset] = useState<AdminAsset | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showTokenizeModal, setShowTokenizeModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Mock on-chain data
  const [mockBlobId, setMockBlobId] = useState('');
  const [mockAttestationHash, setMockAttestationHash] = useState('');
  const [mockTokenAddress, setMockTokenAddress] = useState('');

  // Format currency
  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount.toLocaleString()}`;
  };

  // Handle Register
  const handleRegister = (asset: AdminAsset) => {
    setSelectedAsset(asset);
    // Generate mock on-chain data
    setMockBlobId(`0xblob_${Math.random().toString(36).substring(2, 15)}`);
    setMockAttestationHash(`0xattest_${Math.random().toString(36).substring(2, 15)}`);
    setShowRegisterModal(true);
  };

  const confirmRegister = () => {
    setProcessing(true);
    // Simulate blockchain transaction
    setTimeout(() => {
      console.log('Asset registered on Mantle:', {
        assetId: selectedAsset?.id,
        blobId: mockBlobId,
        attestationHash: mockAttestationHash,
      });

      // Move from approved to registered
      setApprovedAssets(approvedAssets.filter((a) => a.id !== selectedAsset?.id));
      if (selectedAsset) {
        setRegisteredAssets([...registeredAssets, selectedAsset]);
      }

      setProcessing(false);
      setShowRegisterModal(false);
      setSelectedAsset(null);
      // In real app: Call smart contract to register asset
    }, 3000);
  };

  // Handle Tokenize
  const handleTokenize = (asset: AdminAsset) => {
    setSelectedAsset(asset);
    // Generate mock token address
    setMockTokenAddress(`0x${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`);
    setShowTokenizeModal(true);
  };

  const confirmTokenize = () => {
    setProcessing(true);
    // Simulate smart contract deployment
    setTimeout(() => {
      console.log('ERC-3643 Token deployed:', {
        assetId: selectedAsset?.id,
        tokenAddress: mockTokenAddress,
        totalSupply: selectedAsset?.totalTokens,
      });

      // Move from registered to tokenized
      setRegisteredAssets(registeredAssets.filter((a) => a.id !== selectedAsset?.id));

      setProcessing(false);
      setShowTokenizeModal(false);
      setSelectedAsset(null);
      // In real app: Deploy ERC-3643 token contract
    }, 3500);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="font-antic text-3xl font-normal text-foreground mb-2">
          On-Chain Operations Center
        </h2>
        <p className="font-inter text-sm text-foreground/70">
          Register assets on Mantle and deploy ERC-3643 tokens
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className="rounded-xl p-5"
          style={{
            background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)',
          }}
        >
          <div className="flex items-center gap-3">
            <Layers className="w-5 h-5 text-blue-500" />
            <div>
              <p className="font-inter text-xs text-foreground/60">Ready for Registry</p>
              <p className="font-antic text-2xl font-normal text-foreground">
                {approvedAssets.length}
              </p>
            </div>
          </div>
        </div>

        <div
          className="rounded-xl p-5"
          style={{
            background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)',
          }}
        >
          <div className="flex items-center gap-3">
            <Network className="w-5 h-5 text-orange-500" />
            <div>
              <p className="font-inter text-xs text-foreground/60">Registered on Mantle</p>
              <p className="font-antic text-2xl font-normal text-foreground">
                {registeredAssets.length}
              </p>
            </div>
          </div>
        </div>

        <div
          className="rounded-xl p-5"
          style={{
            background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)',
          }}
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <div>
              <p className="font-inter text-xs text-foreground/60">Tokenized Assets</p>
              <p className="font-antic text-2xl font-normal text-foreground">
                {tokenizedAssets.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Phase 1: Assets Ready for Registry */}
      {approvedAssets.length > 0 && (
        <div
          className="rounded-2xl p-8 shadow-lg"
          style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
        >
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Layers className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-antic text-2xl font-normal text-foreground">
                Step 1: Register on Mantle
              </h3>
            </div>
            <p className="font-inter text-sm text-foreground/70">
              Assets approved and ready for on-chain registration
            </p>
          </div>

          <div className="space-y-4">
            {approvedAssets.map((asset) => (
              <div
                key={asset.id}
                className="bg-white rounded-xl p-6 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                        <FileCode className="w-6 h-6 text-foreground/60" />
                      </div>
                      <div>
                        <h4 className="font-antic text-lg font-normal text-foreground">
                          {asset.name}
                        </h4>
                        <p className="font-inter text-xs text-foreground/60">
                          {asset.assetType}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div>
                        <p className="font-inter text-xs text-foreground/60 mb-1">Total Value</p>
                        <p className="font-antic text-base font-normal text-foreground">
                          {formatCurrency(asset.totalValue)}
                        </p>
                      </div>
                      <div>
                        <p className="font-inter text-xs text-foreground/60 mb-1">Total Tokens</p>
                        <p className="font-antic text-base font-normal text-foreground">
                          {asset.totalTokens.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="font-inter text-xs text-foreground/60 mb-1">Originator</p>
                        <p className="font-inter text-sm font-medium text-foreground">
                          {asset.originator.name}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleRegister(asset)}
                    className="font-inter font-medium rounded-xl whitespace-nowrap"
                    style={{
                      background: 'linear-gradient(135deg, hsl(262 68% 57%) 0%, hsl(262 68% 67%) 100%)',
                      boxShadow: '0 4px 14px 0 rgba(119, 75, 229, 0.25)',
                    }}
                  >
                    Register on Mantle
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phase 2: Registered Assets Ready for Tokenization */}
      {registeredAssets.length > 0 && (
        <div
          className="rounded-2xl p-8 shadow-lg"
          style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
        >
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <Network className="w-5 h-5 text-orange-600" />
              </div>
              <h3 className="font-antic text-2xl font-normal text-foreground">
                Step 2: Deploy ERC-3643 Token
              </h3>
            </div>
            <p className="font-inter text-sm text-foreground/70">
              Assets registered on Mantle, ready for tokenization
            </p>
          </div>

          <div className="space-y-4">
            {registeredAssets.map((asset) => (
              <div
                key={asset.id}
                className="bg-white rounded-xl p-6 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                        <FileCode className="w-6 h-6 text-foreground/60" />
                      </div>
                      <div>
                        <h4 className="font-antic text-lg font-normal text-foreground">
                          {asset.name}
                        </h4>
                        <p className="font-inter text-xs text-foreground/60">
                          {asset.assetType}
                        </p>
                      </div>
                    </div>

                    {/* Registry Data */}
                    <div className="bg-gray-50 rounded-lg p-4 mt-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-foreground/50" />
                        <span className="font-inter text-xs text-foreground/60">BlobID:</span>
                        <span className="font-mono text-xs text-foreground">
                          {asset.registry?.blobId || 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-foreground/50" />
                        <span className="font-inter text-xs text-foreground/60">Attestation:</span>
                        <span className="font-mono text-xs text-foreground">
                          {asset.registry?.attestationHash || 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div>
                        <p className="font-inter text-xs text-foreground/60 mb-1">Total Supply</p>
                        <p className="font-antic text-base font-normal text-foreground">
                          {asset.totalTokens.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="font-inter text-xs text-foreground/60 mb-1">Token Price</p>
                        <p className="font-antic text-base font-normal text-foreground">
                          ${asset.tokenPrice}
                        </p>
                      </div>
                      <div>
                        <p className="font-inter text-xs text-foreground/60 mb-1">Standard</p>
                        <p className="font-inter text-sm font-medium text-foreground">
                          ERC-3643
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleTokenize(asset)}
                    className="font-inter font-medium rounded-xl whitespace-nowrap"
                    style={{
                      background: 'linear-gradient(135deg, hsl(262 68% 57%) 0%, hsl(262 68% 67%) 100%)',
                      boxShadow: '0 4px 14px 0 rgba(119, 75, 229, 0.25)',
                    }}
                  >
                    Deploy Token
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tokenized Assets Overview */}
      {tokenizedAssets.length > 0 && (
        <div
          className="rounded-2xl p-8 shadow-lg"
          style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
        >
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-antic text-2xl font-normal text-foreground">
                Tokenized Assets
              </h3>
            </div>
            <p className="font-inter text-sm text-foreground/70">
              Successfully deployed ERC-3643 tokens
            </p>
          </div>

          <div className="space-y-4">
            {tokenizedAssets.map((asset) => (
              <div
                key={asset.id}
                className="bg-white rounded-xl p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-antic text-lg font-normal text-foreground">
                          {asset.name}
                        </h4>
                        <p className="font-inter text-xs text-foreground/60">
                          {asset.assetType}
                        </p>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-inter text-xs text-foreground/60">Token Address:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-foreground">
                            {asset.tokenization?.tokenAddress?.slice(0, 10)}...
                            {asset.tokenization?.tokenAddress?.slice(-8)}
                          </span>
                          <a
                            href={asset.tokenization?.tokenExplorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-600"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-inter text-xs text-foreground/60">Symbol:</span>
                        <span className="font-inter text-xs font-medium text-foreground">
                          {asset.tokenization?.tokenSymbol}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-inter text-xs text-foreground/60">Total Supply:</span>
                        <span className="font-inter text-xs font-medium text-foreground">
                          {asset.tokenization?.totalSupply?.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {approvedAssets.length === 0 && registeredAssets.length === 0 && (
        <div
          className="rounded-2xl p-12 text-center"
          style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
        >
          <Network className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="font-antic text-lg font-semibold text-foreground mb-2">
            No Assets Ready
          </h3>
          <p className="font-inter text-sm text-foreground/60">
            Assets must be compliance-approved before they can be registered on-chain
          </p>
        </div>
      )}

      {/* Register Modal */}
      {showRegisterModal && selectedAsset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Layers className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-antic text-2xl font-normal text-foreground">
                Register Asset on Mantle
              </h3>
            </div>

            <p className="font-inter text-sm text-foreground/70 mb-6">
              This will register the asset on Mantle blockchain with BlobID and attestation hash.
            </p>

            {/* Asset Details */}
            <div className="bg-white rounded-xl p-6 mb-6 space-y-4">
              <h4 className="font-inter text-sm font-semibold text-foreground mb-3">Asset Details</h4>
              <div className="grid grid-cols-2 gap-4 font-inter text-sm">
                <div>
                  <span className="text-foreground/60">Asset Name:</span>
                  <p className="text-foreground font-medium mt-1">{selectedAsset.name}</p>
                </div>
                <div>
                  <span className="text-foreground/60">Asset Type:</span>
                  <p className="text-foreground font-medium mt-1">{selectedAsset.assetType}</p>
                </div>
                <div>
                  <span className="text-foreground/60">Total Value:</span>
                  <p className="text-foreground font-medium mt-1">{formatCurrency(selectedAsset.totalValue)}</p>
                </div>
                <div>
                  <span className="text-foreground/60">Originator:</span>
                  <p className="text-foreground font-medium mt-1">{selectedAsset.originator.name}</p>
                </div>
              </div>
            </div>

            {/* On-Chain Data Preview */}
            <div className="bg-white rounded-xl p-6 mb-6 space-y-3">
              <h4 className="font-inter text-sm font-semibold text-foreground mb-3">
                On-Chain Data (Preview)
              </h4>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Hash className="w-4 h-4 text-foreground/50 mt-1" />
                  <div className="flex-1">
                    <span className="font-inter text-xs text-foreground/60">BlobID:</span>
                    <p className="font-mono text-xs text-foreground break-all">{mockBlobId}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Hash className="w-4 h-4 text-foreground/50 mt-1" />
                  <div className="flex-1">
                    <span className="font-inter text-xs text-foreground/60">Attestation Hash:</span>
                    <p className="font-mono text-xs text-foreground break-all">{mockAttestationHash}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Network className="w-4 h-4 text-foreground/50 mt-1" />
                  <div className="flex-1">
                    <span className="font-inter text-xs text-foreground/60">Registry Contract:</span>
                    <p className="font-mono text-xs text-foreground">0x1234...7890</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={confirmRegister}
                disabled={processing}
                className="flex-1 font-inter font-medium rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, hsl(262 68% 57%) 0%, hsl(262 68% 67%) 100%)',
                  boxShadow: '0 4px 14px 0 rgba(119, 75, 229, 0.25)',
                }}
              >
                {processing ? 'Registering on Mantle...' : 'Confirm Registration'}
              </Button>
              <Button
                onClick={() => {
                  setShowRegisterModal(false);
                  setSelectedAsset(null);
                }}
                disabled={processing}
                className="flex-1 font-inter font-medium rounded-xl bg-gray-200 hover:bg-gray-300 text-foreground"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tokenize Modal */}
      {showTokenizeModal && selectedAsset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                <Network className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="font-antic text-2xl font-normal text-foreground">
                Deploy ERC-3643 Token
              </h3>
            </div>

            <p className="font-inter text-sm text-foreground/70 mb-6">
              This will deploy a compliant ERC-3643 security token for the asset.
            </p>

            {/* Token Details */}
            <div className="bg-white rounded-xl p-6 mb-6 space-y-4">
              <h4 className="font-inter text-sm font-semibold text-foreground mb-3">Token Configuration</h4>
              <div className="grid grid-cols-2 gap-4 font-inter text-sm">
                <div>
                  <span className="text-foreground/60">Token Name:</span>
                  <p className="text-foreground font-medium mt-1">{selectedAsset.name}</p>
                </div>
                <div>
                  <span className="text-foreground/60">Token Symbol:</span>
                  <p className="text-foreground font-medium mt-1">
                    {selectedAsset.name.split(' ').map(w => w[0]).join('').toUpperCase()}
                  </p>
                </div>
                <div>
                  <span className="text-foreground/60">Total Supply:</span>
                  <p className="text-foreground font-medium mt-1">{selectedAsset.totalTokens.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-foreground/60">Token Standard:</span>
                  <p className="text-foreground font-medium mt-1">ERC-3643</p>
                </div>
              </div>
            </div>

            {/* Deployment Preview */}
            <div className="bg-white rounded-xl p-6 mb-6 space-y-3">
              <h4 className="font-inter text-sm font-semibold text-foreground mb-3">
                Deployment Details
              </h4>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Network className="w-4 h-4 text-foreground/50 mt-1" />
                  <div className="flex-1">
                    <span className="font-inter text-xs text-foreground/60">Network:</span>
                    <p className="font-inter text-xs text-foreground font-medium">Mantle Network</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Hash className="w-4 h-4 text-foreground/50 mt-1" />
                  <div className="flex-1">
                    <span className="font-inter text-xs text-foreground/60">Token Address (Preview):</span>
                    <p className="font-mono text-xs text-foreground break-all">{mockTokenAddress}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <FileCode className="w-4 h-4 text-foreground/50 mt-1" />
                  <div className="flex-1">
                    <span className="font-inter text-xs text-foreground/60">Contract Type:</span>
                    <p className="font-inter text-xs text-foreground font-medium">ERC-3643 Compliant Security Token</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={confirmTokenize}
                disabled={processing}
                className="flex-1 font-inter font-medium rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, hsl(262 68% 57%) 0%, hsl(262 68% 67%) 100%)',
                  boxShadow: '0 4px 14px 0 rgba(119, 75, 229, 0.25)',
                }}
              >
                {processing ? 'Deploying Token...' : 'Deploy Token Contract'}
              </Button>
              <Button
                onClick={() => {
                  setShowTokenizeModal(false);
                  setSelectedAsset(null);
                }}
                disabled={processing}
                className="flex-1 font-inter font-medium rounded-xl bg-gray-200 hover:bg-gray-300 text-foreground"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperationsViewPage;
