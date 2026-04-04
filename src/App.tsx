import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { AuthPage } from './pages/AuthPage';
import { Dashboard } from './pages/Dashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { DonationsPage } from './pages/DonationsPage';
import toast from 'react-hot-toast';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            // Automatically grant admin role to the specified email
            if (firebaseUser.email === 'amin14c@gmail.com') {
              userData.role = 'admin';
            }
            setUser({ ...userData, uid: firebaseUser.uid });
          } else {
            setUser(null);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('تم تسجيل الخروج بنجاح');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('خطأ في تسجيل الخروج');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <Layout user={user} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/donations" element={<DonationsPage user={user} />} />
          <Route 
            path="/auth" 
            element={user ? <Navigate to="/dashboard" /> : <AuthPage />} 
          />
          <Route 
            path="/dashboard" 
            element={user ? <Dashboard user={user} /> : <Navigate to="/auth" />} 
          />
          <Route 
            path="/admin" 
            element={user && user.role === 'admin' ? <AdminDashboard /> : <Navigate to="/dashboard" />} 
          />
        </Routes>
      </Layout>
    </Router>
  );
}
