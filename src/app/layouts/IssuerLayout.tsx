// src/app/layouts/IssuerLayout.tsx
import React from 'react';

const IssuerLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div>
      <header>Issuer Header</header>
      <main>{children}</main>
      <footer>Issuer Footer</footer>
    </div>
  );
};

export default IssuerLayout;
