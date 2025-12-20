// src/app/layouts/PublicLayout.tsx
import React from 'react';

const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div>
      <header>Public Header</header>
      <main>{children}</main>
      <footer>Public Footer</footer>
    </div>
  );
};

export default PublicLayout;
