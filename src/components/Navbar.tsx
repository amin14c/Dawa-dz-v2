import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Pill, User, LayoutDashboard, LogOut, Search } from 'lucide-react';
import { cn } from '../lib/utils';

interface NavbarProps {
  user: any;
  onLogout: () => void;
}

export function Navbar({ user, onLogout }: NavbarProps) {
  const location = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-emerald-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-emerald-500 p-1.5 rounded-lg group-hover:rotate-12 transition-transform">
              <Pill className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Dawa DZ
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link 
              to="/" 
              className={cn(
                "text-sm font-medium transition-colors hover:text-emerald-600",
                location.pathname === '/' ? "text-emerald-600" : "text-gray-600"
              )}
            >
              الرئيسية
            </Link>
            {user && (
              <Link 
                to="/dashboard" 
                className={cn(
                  "text-sm font-medium transition-colors hover:text-emerald-600",
                  location.pathname === '/dashboard' ? "text-emerald-600" : "text-gray-600"
                )}
              >
                لوحة التحكم
              </Link>
            )}
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-semibold text-gray-900">{user.name}</span>
                  <span className="text-xs text-gray-500">{user.role === 'pharmacist' ? 'صيدلي' : 'مريض'}</span>
                </div>
                <button
                  onClick={onLogout}
                  className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                className="bg-emerald-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-200"
              >
                تسجيل الدخول
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
