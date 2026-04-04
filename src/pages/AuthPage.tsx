import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Phone, MapPin, Building2, Pill, ArrowRight, ChevronDown } from 'lucide-react';
import { UserRole } from '../types';
import { cn } from '../lib/utils';
import { auth, db } from '../firebase';
import { WILAYAS } from '../data/algeria-locations';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function AuthPage() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [step, setStep] = useState<'role' | 'details'>('role');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    location: '',
    pharmacyName: ''
  });

  const handleRoleSelect = (selectedRole: UserRole) => {
    setRole(selectedRole);
    setStep('details');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    console.log('Starting auth process...', { mode, email: formData.email });
    
    try {
      let firebaseUser = auth.currentUser;
      console.log('Current firebase user:', firebaseUser?.uid);
      
      if (mode === 'register') {
        if (!firebaseUser) {
          console.log('Creating new user...');
          const result = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
          firebaseUser = result.user;
          console.log('User created:', firebaseUser.uid);
        } else if (firebaseUser.email !== formData.email) {
          console.log('Email mismatch, signing out and creating new user...');
          await signOut(auth);
          const result = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
          firebaseUser = result.user;
        }

        const userProfile = {
          uid: firebaseUser.uid,
          name: formData.name,
          phone: formData.phone,
          location: formData.location,
          role: formData.email === 'amin14c@gmail.com' ? 'admin' : role,
          email: formData.email,
          createdAt: Date.now(),
          ...(role === 'pharmacist' && { pharmacyName: formData.pharmacyName })
        };

        console.log('Attempting to save profile to Firestore...', userProfile);
        try {
          await setDoc(doc(db, 'users', firebaseUser.uid), userProfile);
          console.log('Profile saved successfully');
          toast.success('تم إنشاء الحساب بنجاح');
        } catch (firestoreError: any) {
          console.error('Firestore error during registration:', firestoreError);
          handleFirestoreError(firestoreError, OperationType.WRITE, `users/${firebaseUser.uid}`);
        }
      } else {
        console.log('Signing in...');
        const result = await signInWithEmailAndPassword(auth, formData.email, formData.password);
        firebaseUser = result.user;
        console.log('Signed in:', firebaseUser.uid);
        
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (!userDoc.exists()) {
          console.log('Profile missing for existing user');
          toast.error('حسابك موجود ولكن ينقصه ملف تعريف. يرجى إكمال التسجيل.');
          setMode('register');
          setStep('details');
        } else {
          console.log('Profile found');
          toast.success('تم تسجيل الدخول بنجاح');
        }
      }
    } catch (err: any) {
      console.error('Auth/Firestore error:', err);
      let errorMessage = 'حدث خطأ أثناء العملية';
      
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'البريد الإلكتروني مستخدم بالفعل. حاول تسجيل الدخول.';
      } else if (err.code === 'auth/invalid-credential') {
        errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'كلمة المرور ضعيفة جداً (6 أحرف على الأقل)';
      } else if (err.message && err.message.includes('permission-denied')) {
        errorMessage = 'خطأ في أذونات قاعدة البيانات (Permission Denied).';
      } else if (err.message && err.message.startsWith('{')) {
        try {
          const detailedError = JSON.parse(err.message);
          errorMessage = `خطأ تقني: ${detailedError.error}`;
        } catch (e) {}
      } else {
        errorMessage = err.message || 'حدث خطأ غير معروف';
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12">
      {step === 'role' ? (
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-gray-900">مرحباً بك في Dawa DZ</h2>
            <p className="text-gray-600">يرجى اختيار صفتك للمتابعة</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={() => handleRoleSelect('patient')}
              className="group p-6 bg-white border-2 border-gray-100 rounded-3xl text-right hover:border-emerald-500 transition-all hover:shadow-xl hover:shadow-emerald-50"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="bg-emerald-50 p-3 rounded-2xl group-hover:bg-emerald-500 transition-colors">
                  <User className="w-6 h-6 text-emerald-600 group-hover:text-white" />
                </div>
                <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">طالب دواء (مريض)</h3>
              <p className="text-sm text-gray-500">أبحث عن دواء مفقود أو أحتاج لمساعدة طبية</p>
            </button>

            <button
              onClick={() => handleRoleSelect('pharmacist')}
              className="group p-6 bg-white border-2 border-gray-100 rounded-3xl text-right hover:border-emerald-500 transition-all hover:shadow-xl hover:shadow-emerald-50"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="bg-emerald-50 p-3 rounded-2xl group-hover:bg-emerald-500 transition-colors">
                  <Building2 className="w-6 h-6 text-emerald-600 group-hover:text-white" />
                </div>
                <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">صيدلي</h3>
              <p className="text-sm text-gray-500">أريد مساعدة المرضى وتوفير الأدوية المفقودة</p>
            </button>

            <button
              onClick={() => handleRoleSelect('donor')}
              className="group p-6 bg-white border-2 border-gray-100 rounded-3xl text-right hover:border-emerald-500 transition-all hover:shadow-xl hover:shadow-emerald-50"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="bg-emerald-50 p-3 rounded-2xl group-hover:bg-emerald-500 transition-colors">
                  <Pill className="w-6 h-6 text-emerald-600 group-hover:text-white" />
                </div>
                <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">متبرع</h3>
              <p className="text-sm text-gray-500">لدي أدوية أريد التبرع بها للمحتاجين</p>
            </button>
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-50 space-y-8"
        >
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setStep('role')}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowRight className="w-6 h-6 rotate-180" />
            </button>
            <h2 className="text-2xl font-bold text-gray-900">
              {mode === 'register' ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
            </h2>
            <div className="w-6" />
          </div>

          <div className="flex bg-gray-100 p-1 rounded-2xl">
            <button
              onClick={() => setMode('login')}
              className={cn(
                "flex-1 py-2 rounded-xl text-sm font-bold transition-all",
                mode === 'login' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500"
              )}
            >
              دخول
            </button>
            <button
              onClick={() => setMode('register')}
              className={cn(
                "flex-1 py-2 rounded-xl text-sm font-bold transition-all",
                mode === 'register' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500"
              )}
            >
              تسجيل
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 mr-1">البريد الإلكتروني</label>
              <input
                required
                type="email"
                placeholder="example@mail.com"
                className="w-full px-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 mr-1">كلمة المرور</label>
              <input
                required
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            {mode === 'register' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 mr-1">الاسم الكامل</label>
                  <div className="relative">
                    <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      required
                      type="text"
                      placeholder="أدخل اسمك الكامل"
                      className="w-full pr-12 pl-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 mr-1">رقم الهاتف</label>
                  <div className="relative">
                    <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      required
                      type="tel"
                      placeholder="05XXXXXXXX"
                      className="w-full pr-12 pl-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 mr-1">الولاية</label>
                  <div className="relative">
                    <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                      required
                      className="w-full pr-12 pl-10 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all appearance-none"
                      value={formData.location}
                      onChange={e => setFormData({ ...formData, location: e.target.value })}
                    >
                      <option value="">اختر الولاية</option>
                      {WILAYAS.map(wilaya => (
                        <option key={wilaya.id} value={wilaya.name}>
                          {wilaya.id} - {wilaya.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {role === 'pharmacist' && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 mr-1">اسم الصيدلية</label>
                    <div className="relative">
                      <Building2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        required
                        type="text"
                        placeholder="اسم صيدليتك"
                        className="w-full pr-12 pl-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all"
                        value={formData.pharmacyName}
                        onChange={e => setFormData({ ...formData, pharmacyName: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
            >
              {loading ? 'جاري المعالجة...' : (mode === 'register' ? 'إنشاء الحساب' : 'دخول')}
            </button>
          </form>
        </motion.div>
      )}
    </div>
  );
}
