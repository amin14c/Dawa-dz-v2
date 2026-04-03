import React from 'react';
import { Navbar } from './Navbar';
import { Toaster } from 'react-hot-toast';

interface LayoutProps {
  children: React.ReactNode;
  user: any;
  onLogout: () => void;
}

export function Layout({ children, user, onLogout }: LayoutProps) {
  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans" dir="rtl">
      <Navbar user={user} onLogout={onLogout} />
      <main className="pt-20 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {children}
      </main>
      <Toaster position="bottom-left" />
    </div>
  );
}
