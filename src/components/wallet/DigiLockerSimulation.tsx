// src/components/wallet/DigiLockerSimulation.tsx

import { useState } from 'react';
import { Button } from '../ui/button';

interface DigiLockerSimulationProps {
  onComplete: (documents: { aadhaar: string; pan: string }) => void;
}

/**
 * DigiLockerSimulation Component
 * Frontend-only simulation of DigiLocker identity verification
 * No real API calls, no manual input fields
 */
export const DigiLockerSimulation = ({ onComplete }: DigiLockerSimulationProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [documents, setDocuments] = useState<{ aadhaar: string; pan: string } | null>(null);
  const [step, setStep] = useState<'connect' | 'fetching' | 'preview'>('connect');

  const handleConnect = async () => {
    setIsConnecting(true);
    setStep('fetching');

    // Simulate DigiLocker connection delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsConnecting(false);
    setIsFetching(true);

    // Simulate fetching Aadhaar
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Simulate fetching PAN
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Generate masked previews
    const maskedDocuments = {
      aadhaar: 'XXXX-XXXX-1234',
      pan: 'ABCDE1234F',
    };

    setDocuments(maskedDocuments);
    setIsFetching(false);
    setStep('preview');
  };

  const handleContinue = () => {
    if (documents) {
      onComplete(documents);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold text-foreground">
          Verify your identity
        </h2>
        <p className="text-sm text-muted-foreground">
          Connect DigiLocker to verify your Aadhaar and PAN details
        </p>
      </div>

      {/* Connect Stage */}
      {step === 'connect' && (
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
          </div>

          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full"
            size="lg"
          >
            {isConnecting ? 'Connecting...' : 'Connect DigiLocker'}
          </Button>
        </div>
      )}

      {/* Fetching Stage */}
      {step === 'fetching' && (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
              <span className="text-sm text-foreground">
                Fetching Aadhaar details...
              </span>
            </div>

            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
              <span className="text-sm text-foreground">
                Fetching PAN details...
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Preview Stage */}
      {step === 'preview' && documents && (
        <div className="space-y-4">
          <div className="space-y-3">
            {/* Aadhaar Preview */}
            <div className="p-4 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Aadhaar</p>
                  <p className="text-sm font-mono font-medium text-foreground">
                    {documents.aadhaar}
                  </p>
                </div>
                <svg
                  className="w-5 h-5 text-green-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>

            {/* PAN Preview */}
            <div className="p-4 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">PAN</p>
                  <p className="text-sm font-mono font-medium text-foreground">
                    {documents.pan}
                  </p>
                </div>
                <svg
                  className="w-5 h-5 text-green-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </div>

          <Button
            onClick={handleContinue}
            className="w-full"
            size="lg"
          >
            Continue
          </Button>
        </div>
      )}
    </div>
  );
};
