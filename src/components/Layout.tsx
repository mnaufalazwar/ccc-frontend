import type { ReactNode } from 'react';
import Navbar from './Navbar';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="layout">
      <Navbar />
      <main className="main-content">{children}</main>
    </div>
  );
}
