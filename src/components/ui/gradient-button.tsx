// src/components/ui/gradient-button.tsx

import * as React from 'react';
import { cn } from '../../lib/utils';

export interface GradientButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'purple' | 'custom';
  size?: 'sm' | 'default' | 'lg';
  customStyle?: React.CSSProperties;
}

const GradientButton = React.forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ className, variant = 'default', size = 'default', customStyle, children, ...props }, ref) => {
    // Button size classes
    const sizeClasses = {
      sm: 'px-4 py-2 text-sm',
      default: 'px-6 py-3 text-base',
      lg: 'px-8 py-4 text-lg',
    };

    // Variant styles
    const variantStyles = {
      default: {
        background: 'linear-gradient(135deg, hsla(204, 15%, 61%, 1.00) 0%, hsla(215, 46%, 54%, 1.00) 100%)',
        boxShadow: '0 4px 14px 0 rgba(75, 167, 229, 0.25), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)',
      },
      purple: {
        background: 'linear-gradient(135deg, hsl(262 68% 57%) 0%, hsl(262 68% 67%) 100%)',
        boxShadow: '0 4px 14px 0 rgba(119, 75, 229, 0.25), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)',
      },
      custom: customStyle || {},
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-xl font-inter font-medium text-white',
          'transition-all duration-200 hover:opacity-90 hover:-translate-y-0.5',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
          sizeClasses[size],
          className
        )}
        style={variantStyles[variant]}
        {...props}
      >
        {children}
      </button>
    );
  }
);

GradientButton.displayName = 'GradientButton';

export { GradientButton };
