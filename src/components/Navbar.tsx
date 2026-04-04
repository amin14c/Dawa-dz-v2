import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Pill, User, LayoutDashboard, LogOut, Search, Moon, Sun, Bell, ShieldAlert, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { ComplaintModal } from './ComplaintModal';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Notification } from '../types';

interface NavbarProps {
  user: any;
  onLogout: () => void;
}

export function Navbar({ user, onLogout }: NavbarProps) {
  const location = useLocation();
  const [isDark, setIsDark] = useState(false);
  const [isComplaintOpen, setIsComplaintOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'), 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(notifs);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { read: true });
    } catch (error) {
      console.error("Error marking notification as read", error);
    }
  };

  const markAllAsRead = async () => {
    const unreadNotifs = notifications.filter(n => !n.read);
    for (const notif of unreadNotifs) {
      await markAsRead(notif.id);
    }
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-emerald-100 dark:border-gray-800">
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
                  "text-sm font-medium transition-colors hover:text-emerald-600 dark:hover:text-emerald-400",
                  location.pathname === '/' ? "text-emerald-600 dark:text-emerald-400" : "text-gray-600 dark:text-gray-300"
                )}
              >
                الرئيسية
              </Link>
              <Link 
                to="/donations" 
                className={cn(
                  "text-sm font-medium transition-colors hover:text-emerald-600 dark:hover:text-emerald-400",
                  location.pathname === '/donations' ? "text-emerald-600 dark:text-emerald-400" : "text-gray-600 dark:text-gray-300"
                )}
              >
                التبرعات
              </Link>
              {user && (
                <Link 
                  to="/dashboard" 
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-emerald-600 dark:hover:text-emerald-400",
                    location.pathname === '/dashboard' ? "text-emerald-600 dark:text-emerald-400" : "text-gray-600 dark:text-gray-300"
                  )}
                >
                  لوحة التحكم
                </Link>
              )}
              {user?.role === 'admin' && (
                <Link 
                  to="/admin" 
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-red-600 dark:hover:text-red-400",
                    location.pathname === '/admin' ? "text-red-600 dark:text-red-400" : "text-gray-600 dark:text-gray-300"
                  )}
                >
                  الإدارة
                </Link>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsDark(!isDark)}
                className="p-2 text-gray-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 transition-colors"
                title="تغيير المظهر"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {user ? (
                <div className="flex items-center gap-3">
                  <div className="relative" ref={notificationsRef}>
                    <button 
                      onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                      className="relative p-2 text-gray-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 transition-colors"
                    >
                      <Bell className="w-5 h-5" />
                      {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900"></span>
                      )}
                    </button>

                    {isNotificationsOpen && (
                      <div className="absolute left-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                          <h3 className="font-bold text-gray-900 dark:text-white">الإشعارات</h3>
                          {unreadCount > 0 && (
                            <button 
                              onClick={markAllAsRead}
                              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                            >
                              تحديد الكل كمقروء
                            </button>
                          )}
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                              لا توجد إشعارات
                            </div>
                          ) : (
                            notifications.map(notif => (
                              <div 
                                key={notif.id} 
                                className={cn(
                                  "p-4 border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer",
                                  !notif.read ? "bg-emerald-50/50 dark:bg-emerald-900/10" : ""
                                )}
                                onClick={() => markAsRead(notif.id)}
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <h4 className={cn(
                                    "text-sm font-semibold",
                                    notif.type === 'success' ? "text-emerald-600 dark:text-emerald-400" : 
                                    notif.type === 'warning' ? "text-orange-600 dark:text-orange-400" : 
                                    "text-blue-600 dark:text-blue-400"
                                  )}>{notif.title}</h4>
                                  {!notif.read && <span className="w-2 h-2 bg-emerald-500 rounded-full mt-1.5"></span>}
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-300">{notif.message}</p>
                                <span className="text-[10px] text-gray-400 mt-2 block">
                                  {new Date(notif.createdAt).toLocaleString('ar-DZ')}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => setIsComplaintOpen(true)}
                    className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                    title="تقديم شكوى"
                  >
                    <ShieldAlert className="w-5 h-5" />
                  </button>

                  <div className="flex flex-col items-end mr-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{user.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {user.role === 'pharmacist' ? 'صيدلي' : user.role === 'admin' ? 'مسير' : 'مريض'}
                    </span>
                  </div>
                  <button
                    onClick={onLogout}
                    className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
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

      <ComplaintModal 
        isOpen={isComplaintOpen} 
        onClose={() => setIsComplaintOpen(false)} 
        user={user} 
      />
    </>
  );
}
