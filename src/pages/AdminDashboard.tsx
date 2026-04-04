import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, deleteDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Complaint, MedicationRequest, PlatformSettings } from '../types';
import { motion } from 'motion/react';
import { Shield, AlertTriangle, Settings, Trash2, CheckCircle, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'complaints' | 'requests' | 'settings'>('complaints');
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [requests, setRequests] = useState<MedicationRequest[]>([]);
  const [settings, setSettings] = useState<PlatformSettings>({
    bannerActive: false,
    bannerMessage: '',
    bannerType: 'info'
  });

  useEffect(() => {
    // Fetch Complaints
    const unsubComplaints = onSnapshot(collection(db, 'complaints'), (snapshot) => {
      setComplaints(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Complaint)).sort((a, b) => b.createdAt - a.createdAt));
    });

    // Fetch Requests
    const unsubRequests = onSnapshot(collection(db, 'medication_requests'), (snapshot) => {
      setRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MedicationRequest)).sort((a, b) => b.createdAt - a.createdAt));
    });

    // Fetch Settings
    const unsubSettings = onSnapshot(doc(db, 'platform_settings', 'main'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as PlatformSettings);
      }
    });

    return () => {
      unsubComplaints();
      unsubRequests();
      unsubSettings();
    };
  }, []);

  const handleResolveComplaint = async (id: string) => {
    try {
      await updateDoc(doc(db, 'complaints', id), { status: 'resolved' });
      toast.success('تم حل الشكوى');
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  const handleDeleteRequest = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الطلب؟')) return;
    try {
      await deleteDoc(doc(db, 'medication_requests', id));
      toast.success('تم حذف الطلب المخالف');
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'platform_settings', 'main'), settings);
      toast.success('تم حفظ الإعدادات بنجاح');
    } catch (error) {
      toast.error('حدث خطأ أثناء الحفظ');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-red-100 p-3 rounded-2xl dark:bg-red-900/30">
          <Shield className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">لوحة تحكم المسير</h1>
          <p className="text-gray-500 dark:text-gray-400">إدارة المنصة، الشكاوي، والإعدادات</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-gray-200 dark:border-gray-800 pb-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('complaints')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${
            activeTab === 'complaints' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <AlertTriangle className="w-5 h-5" />
          الشكاوي ({complaints.filter(c => c.status === 'pending').length})
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${
            activeTab === 'requests' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          إدارة الطلبات
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${
            activeTab === 'settings' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <Settings className="w-5 h-5" />
          إعدادات المنصة
        </button>
      </div>

      <div className="mt-8">
        {activeTab === 'complaints' && (
          <div className="space-y-4">
            {complaints.length === 0 ? (
              <p className="text-center text-gray-500 py-12">لا توجد شكاوي حالياً</p>
            ) : (
              complaints.map(complaint => (
                <div key={complaint.id} className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-gray-900 dark:text-white">{complaint.userName}</span>
                      <span className="text-xs text-gray-400">{new Date(complaint.createdAt).toLocaleString('ar-DZ')}</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300">{complaint.text}</p>
                  </div>
                  {complaint.status === 'pending' ? (
                    <button
                      onClick={() => handleResolveComplaint(complaint.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      تحديد كمحلول
                    </button>
                  ) : (
                    <span className="flex items-center gap-1 text-emerald-500 font-bold text-sm">
                      <CheckCircle className="w-4 h-4" />
                      تم الحل
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requests.map(request => (
              <div key={request.id} className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg dark:text-white">{request.medicationName}</h3>
                    <p className="text-sm text-gray-500">{request.patientName} • {request.location}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteRequest(request.id)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors"
                    title="حذف الطلب المخالف"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2">{request.medicalInfo}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-6 max-w-2xl">
            <h2 className="text-xl font-bold dark:text-white mb-4">رسالة الواجهة الرئيسية (Banner)</h2>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.bannerActive}
                onChange={e => setSettings({ ...settings, bannerActive: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="font-bold text-gray-700 dark:text-gray-300">تفعيل الرسالة</span>
            </label>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">نوع الرسالة</label>
              <select
                value={settings.bannerType}
                onChange={e => setSettings({ ...settings, bannerType: e.target.value as any })}
                className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 dark:text-white"
              >
                <option value="info">معلومة عامة (أزرق)</option>
                <option value="warning">تنبيه / توعية (برتقالي)</option>
                <option value="success">إنجاز / شكر (أخضر)</option>
                <option value="holiday">مناسبة / عيد (بنفسجي)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">نص الرسالة</label>
              <textarea
                value={settings.bannerMessage}
                onChange={e => setSettings({ ...settings, bannerMessage: e.target.value })}
                placeholder="مثال: بمناسبة شهر رمضان المبارك، نتمنى لكم صياماً مقبولاً..."
                className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 min-h-[120px] dark:text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all"
            >
              حفظ الإعدادات
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
