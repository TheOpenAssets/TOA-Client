// src/components/ui/page-loader.tsx

import * as React from 'react';
import { Loader } from './loader';

export interface PageLoaderProps {
  text?: string;
  showText?: boolean;
}

const PageLoader: React.FC<PageLoaderProps> = ({
  text = 'Loading...',
  showText = true
}) => {
  return (
    <div className="fixed inset-0 bg-[#050505] flex flex-col items-center justify-center z-[9999]">
      <Loader size="md" />
      {showText && (
        <p className="mt-8 text-[#d4af37] font-inter text-lg animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
};

export { PageLoader };
