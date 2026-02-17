import React, { createContext, useContext } from 'react';

export interface AuthStrategy {
    isAuthenticating: boolean;
    isAuthenticated: boolean;
    address: string | undefined;
    error: string | null;
    login: () => Promise<void>;
    logout: () => void;
    // Specialized helper for "Get Started" which might differ per network
    handleGetStarted: () => Promise<void>;
    // For issuer flow
    handleIssuerGetStarted: () => Promise<void>;
}

const AuthStrategyContext = createContext<AuthStrategy | undefined>(undefined);

export const useAuthStrategy = () => {
    const context = useContext(AuthStrategyContext);
    if (!context) {
        throw new Error('useAuthStrategy must be used within an AuthStrategyProvider');
    }
    return context;
};

export const AuthStrategyProvider: React.FC<{ strategy: AuthStrategy; children: React.ReactNode }> = ({
    strategy,
    children,
}) => {
    return <AuthStrategyContext.Provider value={strategy}>{children}</AuthStrategyContext.Provider>;
};
