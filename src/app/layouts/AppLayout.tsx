// src/app/layouts/AppLayout.tsx
import React from 'react';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div>
      <header>App Header</header>
      <main>{children}</main>
      <footer>App Footer</footer>
    </div>
  );
};

export default AppLayout;
