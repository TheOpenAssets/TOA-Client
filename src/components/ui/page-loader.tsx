// src/components/ui/page-loader.tsx

import * as React from 'react';
import { Loader } from './loader';
// import { ShaderAnimation } from './shimmer-lines';

export interface PageLoaderProps {
  text?: string;
  showText?: boolean;
}

const PageLoader: React.FC<PageLoaderProps> = ({
  text = 'Loading...',
  showText = true
}) => {
  return (
    <div className="bg-transparent flex flex-col items-center justify-center">
      <Loader size="md" />
      {showText && (
        <p className="mt-4 text-gray-900 font-gellix text-xl">
          {text}
        </p>
      )}
    </div>
  );
};

export { PageLoader };
