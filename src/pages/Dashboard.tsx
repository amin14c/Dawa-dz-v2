import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Pill, ClipboardList, Send, MapPin, Package, Clock, CheckCircle2, MessageSquare, ChevronDown } from 'lucide-react';
import { MedicationRequest, PharmacyOffer } from '../types';
import { cn } from '../lib/utils';
import { db, auth } from '../firebase';
import { COMMON_MEDICINES } from '../data/medicines';
import { collection, addDoc, onSnapshot, query, orderBy, where, serverTimestamp, doc, setDoc } from 'firebase/firestore';
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

interface DashboardProps {
  user: any;
}

export function Dashboard({ user }: DashboardProps) {
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [requests, setRequests] = useState<MedicationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRequest, setNewRequest] = useState({
    medicationName: '',
    medicalInfo: '',
    dosage: '',
    boxes: 1,
    deliveryMethod: 'pickup' as 'pickup' | 'delivery',
    urgency: 'normal' as 'normal' | 'urgent' | 'critical'
  });

  useEffect(() => {
    let q;
    if (user.role === 'pharmacist') {
      // Pharmacists see all pending requests in their location
      q = query(
        collection(db, 'medication_requests'),
        where('location', '==', user.location),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );
    } else {
      // Patients see only their own requests
      q = query(
        collection(db, 'medication_requests'),
        where('patientUid', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedRequests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MedicationRequest[];
      setRequests(fetchedRequests);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'medication_requests');
    });

    return () => unsubscribe();
  }, [user]);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const requestData = {
        patientUid: user.uid,
        patientName: user.name,
        ...newRequest,
        status: 'pending',
        location: user.location,
        createdAt: Date.now()
      };
      await addDoc(collection(db, 'medication_requests'), requestData);
      setShowNewRequest(false);
      setNewRequest({
        medicationName: '',
        medicalInfo: '',
        dosage: '',
        boxes: 1,
        deliveryMethod: 'pickup',
        urgency: 'normal'
      });
      toast.success('تم نشر طلبك بنجاح!');
    } catch (error) {
      toast.error('حدث خطأ أثناء نشر الطلب');
      handleFirestoreError(error, OperationType.CREATE, 'medication_requests');
    }
  };

  const handleProvideMedication = async (requestId: string) => {
    try {
      // In a real app, we would create an offer subcollection
      // For now, let's just update the status to show it's found
      const requestRef = doc(db, 'medication_requests', requestId);
      await setDoc(requestRef, { status: 'found' }, { merge: true });
      toast.success('تم إرسال ردك للمريض!');
    } catch (error) {
      toast.error('حدث خطأ أثناء الرد');
      handleFirestoreError(error, OperationType.UPDATE, `medication_requests/${requestId}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (user.role === 'pharmacist') {
    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">طلبات الأدوية المفقودة</h1>
            <p className="text-gray-500">ساعد المرضى في العثور على أدويتهم في منطقة {user.location}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {requests.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-gray-200">
              <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Pill className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد طلبات جديدة</h3>
              <p className="text-gray-500">سيظهر هنا أي طلب دواء جديد في منطقتك</p>
            </div>
          ) : (
            requests.map((req) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-50 p-2 rounded-xl">
                        <Pill className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-bold text-gray-900">{req.medicationName}</h3>
                          {req.urgency === 'critical' && (
                            <span className="animate-pulse bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">حالة حرجة</span>
                          )}
                          {req.urgency === 'urgent' && (
                            <span className="bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">مستعجل</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">بواسطة: {req.patientName}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Package className="w-4 h-4 text-emerald-500" />
                        <span>{req.boxes} علب</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 text-emerald-500" />
                        <span>{req.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4 text-emerald-500" />
                        <span>{new Date(req.createdAt).toLocaleTimeString('ar-DZ')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Send className="w-4 h-4 text-emerald-500" />
                        <span>{req.deliveryMethod === 'pickup' ? 'استلام' : 'توصيل'}</span>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-2xl">
                      <p className="text-sm font-semibold text-gray-700 mb-1">المعلومات الطبية والجرعة:</p>
                      <p className="text-sm text-gray-600">{req.medicalInfo} - {req.dosage}</p>
                    </div>
                  </div>

                  <div className="flex md:flex-col justify-end gap-3">
                    <button 
                      onClick={() => handleProvideMedication(req.id)}
                      className="flex-1 md:flex-none bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-colors"
                    >
                      متوفر لدي
                    </button>
                    <button className="flex-1 md:flex-none bg-white text-gray-600 border border-gray-200 px-6 py-3 rounded-2xl font-bold hover:bg-gray-50 transition-colors">
                      مراسلة
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">طلباتي</h1>
          <p className="text-gray-500">تتبع حالة طلبات الأدوية الخاصة بك</p>
        </div>
        <button
          onClick={() => setShowNewRequest(true)}
          className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
        >
          <Plus className="w-5 h-5" />
          طلب دواء جديد
        </button>
      </div>

      <AnimatePresence>
        {showNewRequest && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div className="bg-white w-full max-w-xl rounded-[2.5rem] p-8 space-y-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">طلب دواء جديد</h2>
                <button 
                  onClick={() => setShowNewRequest(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Plus className="w-6 h-6 rotate-45 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleCreateRequest} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 mr-1">مستوى الاستعجال</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'normal', label: 'عادي', color: 'bg-blue-50 border-blue-200 text-blue-700' },
                      { id: 'urgent', label: 'مستعجل', color: 'bg-orange-50 border-orange-200 text-orange-700' },
                      { id: 'critical', label: 'حالة حرجة', color: 'bg-red-50 border-red-200 text-red-700' }
                    ].map((level) => (
                      <button
                        key={level.id}
                        type="button"
                        onClick={() => setNewRequest({ ...newRequest, urgency: level.id as any })}
                        className={cn(
                          "py-3 rounded-xl font-bold text-xs transition-all border-2",
                          newRequest.urgency === level.id 
                            ? level.color 
                            : "bg-gray-50 border-transparent text-gray-500"
                        )}
                      >
                        {level.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 mr-1">اسم الدواء</label>
                  <div className="relative">
                    <Pill className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      required
                      type="text"
                      list="medicines-list"
                      placeholder="مثال: Ventoline, Panadol..."
                      className="w-full pr-12 pl-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all"
                      value={newRequest.medicationName}
                      onChange={e => setNewRequest({ ...newRequest, medicationName: e.target.value })}
                    />
                    <datalist id="medicines-list">
                      {COMMON_MEDICINES.map((med, index) => (
                        <option key={index} value={med} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 mr-1">الجرعة</label>
                    <input
                      required
                      type="text"
                      placeholder="مثال: 500mg"
                      className="w-full px-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all"
                      value={newRequest.dosage}
                      onChange={e => setNewRequest({ ...newRequest, dosage: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 mr-1">عدد العلب</label>
                    <input
                      required
                      type="number"
                      min="1"
                      className="w-full px-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all"
                      value={newRequest.boxes}
                      onChange={e => setNewRequest({ ...newRequest, boxes: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 mr-1">المعلومات الطبية</label>
                  <textarea
                    required
                    placeholder="اذكر حالتك الطبية أو أي ملاحظات إضافية..."
                    rows={3}
                    className="w-full px-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all resize-none"
                    value={newRequest.medicalInfo}
                    onChange={e => setNewRequest({ ...newRequest, medicalInfo: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 mr-1">طريقة الاستلام</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setNewRequest({ ...newRequest, deliveryMethod: 'pickup' })}
                      className={cn(
                        "py-4 rounded-2xl font-bold transition-all border-2",
                        newRequest.deliveryMethod === 'pickup' 
                          ? "bg-emerald-50 border-emerald-500 text-emerald-700" 
                          : "bg-gray-50 border-transparent text-gray-500"
                      )}
                    >
                      استلام من الصيدلية
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewRequest({ ...newRequest, deliveryMethod: 'delivery' })}
                      className={cn(
                        "py-4 rounded-2xl font-bold transition-all border-2",
                        newRequest.deliveryMethod === 'delivery' 
                          ? "bg-emerald-50 border-emerald-500 text-emerald-700" 
                          : "bg-gray-50 border-transparent text-gray-500"
                      )}
                    >
                      توصيل للمنزل
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                >
                  نشر الطلب
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-6">
        {requests.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-gray-200">
            <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <ClipboardList className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد طلبات حالياً</h3>
            <p className="text-gray-500">ابدأ بإضافة أول طلب دواء لك</p>
          </div>
        ) : (
          requests.map((req) => (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm"
            >
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-50 p-2 rounded-xl">
                      <Pill className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-bold text-gray-900">{req.medicationName}</h3>
                        {req.urgency === 'critical' && (
                          <span className="animate-pulse bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">حالة حرجة</span>
                        )}
                        {req.urgency === 'urgent' && (
                          <span className="bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">مستعجل</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded-md font-medium">قيد البحث</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-500">{new Date(req.createdAt).toLocaleDateString('ar-DZ')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Package className="w-4 h-4 text-emerald-500" />
                      <span>{req.boxes} علب ({req.dosage})</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Send className="w-4 h-4 text-emerald-500" />
                      <span>{req.deliveryMethod === 'pickup' ? 'استلام' : 'توصيل'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                  <div className="bg-emerald-500 p-2 rounded-full">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-900">0 ردود</p>
                    <p className="text-xs text-emerald-700">بانتظار رد الصيادلة...</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
