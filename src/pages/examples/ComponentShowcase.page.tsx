// src/pages/examples/ComponentShowcase.page.tsx

import { useState } from 'react';
import { GradientButton } from '../../components/ui/gradient-button';
import { Loader } from '../../components/ui/loader';
import { PageLoader } from '../../components/ui/page-loader';
import { Play } from 'lucide-react';

const ComponentShowcasePage = () => {
  const [showPageLoader, setShowPageLoader] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleButtonClick = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      alert('Button action completed!');
    }, 2000);
  };

  const handleShowPageLoader = () => {
    setShowPageLoader(true);
    setTimeout(() => {
      setShowPageLoader(false);
    }, 5000);
  };

  return (
    <div className="min-h-screen bg-[#f6fbff] p-8">
      {showPageLoader && <PageLoader text="Loading Application..." />}

      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div>
          <h1 className="font-antic text-4xl font-normal text-foreground mb-2">
            Component Showcase
          </h1>
          <p className="font-inter text-sm text-foreground/70">
            Preview of GradientButton and Loader components
          </p>
        </div>

        {/* Buttons Section */}
        <div
          className="rounded-2xl p-8"
          style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
        >
          <h2 className="font-antic text-2xl font-normal text-foreground mb-6">
            Gradient Buttons
          </h2>

          <div className="space-y-8">
            {/* Default Blue Variant */}
            <div>
              <h3 className="font-inter text-sm font-medium text-foreground/70 mb-4">
                Default (Blue Gradient)
              </h3>
              <div className="flex flex-wrap gap-4">
                <GradientButton size="sm" onClick={handleButtonClick}>
                  {isLoading ? 'Loading...' : 'Small Button'}
                </GradientButton>
                <GradientButton size="default" onClick={handleButtonClick}>
                  {isLoading ? 'Loading...' : 'Default Button'}
                </GradientButton>
                <GradientButton size="lg" onClick={handleButtonClick}>
                  {isLoading ? 'Loading...' : 'Large Button'}
                </GradientButton>
                <GradientButton disabled>
                  Disabled Button
                </GradientButton>
              </div>
            </div>

            {/* Purple Variant */}
            <div>
              <h3 className="font-inter text-sm font-medium text-foreground/70 mb-4">
                Purple Variant
              </h3>
              <div className="flex flex-wrap gap-4">
                <GradientButton variant="purple" size="sm">
                  Purple Small
                </GradientButton>
                <GradientButton variant="purple" size="default">
                  Purple Default
                </GradientButton>
                <GradientButton variant="purple" size="lg">
                  Purple Large
                </GradientButton>
              </div>
            </div>

            {/* With Icons */}
            <div>
              <h3 className="font-inter text-sm font-medium text-foreground/70 mb-4">
                With Icons
              </h3>
              <div className="flex flex-wrap gap-4">
                <GradientButton>
                  <Play className="w-4 h-4 mr-2" />
                  Play Video
                </GradientButton>
                <GradientButton variant="purple">
                  <Play className="w-4 h-4 mr-2" />
                  Get Started
                </GradientButton>
              </div>
            </div>

            {/* Custom Style */}
            <div>
              <h3 className="font-inter text-sm font-medium text-foreground/70 mb-4">
                Custom Style
              </h3>
              <GradientButton
                variant="custom"
                customStyle={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  boxShadow: '0 4px 14px 0 rgba(102, 126, 234, 0.4)',
                }}
              >
                Custom Gradient
              </GradientButton>
            </div>
          </div>
        </div>

        {/* Loaders Section */}
        <div
          className="rounded-2xl p-8"
          style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
        >
          <h2 className="font-antic text-2xl font-normal text-foreground mb-6">
            Animated Loaders
          </h2>

          <div className="space-y-8">
            {/* Loader Sizes */}
            <div>
              <h3 className="font-inter text-sm font-medium text-foreground/70 mb-4">
                Different Sizes
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 bg-[#050505] rounded-xl p-8">
                <div className="flex flex-col items-center gap-4">
                  <Loader size="sm" />
                  <span className="text-[#d4af37] font-inter text-xs">Small</span>
                </div>
                <div className="flex flex-col items-center gap-4">
                  <Loader size="md" />
                  <span className="text-[#d4af37] font-inter text-xs">Medium</span>
                </div>
                <div className="flex flex-col items-center gap-4">
                  <Loader size="lg" />
                  <span className="text-[#d4af37] font-inter text-xs">Large</span>
                </div>
                <div className="flex flex-col items-center gap-4">
                  <Loader size="xl" />
                  <span className="text-[#d4af37] font-inter text-xs">Extra Large</span>
                </div>
              </div>
            </div>

            {/* Page Loader Demo */}
            <div>
              <h3 className="font-inter text-sm font-medium text-foreground/70 mb-4">
                Full Page Loader
              </h3>
              <GradientButton onClick={handleShowPageLoader}>
                Show Page Loader (5 seconds)
              </GradientButton>
              <p className="font-inter text-xs text-foreground/60 mt-2">
                Click to see the full-page loading overlay
              </p>
            </div>
          </div>
        </div>

        {/* Usage Examples */}
        <div
          className="rounded-2xl p-8"
          style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #d8dfe5 100%)' }}
        >
          <h2 className="font-antic text-2xl font-normal text-foreground mb-6">
            Usage Examples
          </h2>

          <div className="space-y-4 font-mono text-sm bg-gray-900 text-green-400 p-6 rounded-xl overflow-x-auto">
            <div>
              <p className="text-gray-500">// Import components</p>
              <p className="text-blue-400">import</p> {`{ GradientButton }`} <p className="text-blue-400">from</p> <p className="text-yellow-400">'@/components/ui/gradient-button'</p>;
            </div>
            <div className="mt-4">
              <p className="text-gray-500">// Default blue button</p>
              <p>{`<GradientButton onClick={handleClick}>`}</p>
              <p className="ml-4">Click Me</p>
              <p>{`</GradientButton>`}</p>
            </div>
            <div className="mt-4">
              <p className="text-gray-500">// Purple variant</p>
              <p>{`<GradientButton variant="purple" size="lg">`}</p>
              <p className="ml-4">Large Purple Button</p>
              <p>{`</GradientButton>`}</p>
            </div>
            <div className="mt-4">
              <p className="text-gray-500">// Show page loader</p>
              <p>{`<PageLoader text="Loading..." />`}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComponentShowcasePage;
