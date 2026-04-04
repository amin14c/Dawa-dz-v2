import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { Plus, Pill, ClipboardList, Send, MapPin, Package, Clock, CheckCircle2, MessageSquare, ChevronDown, Search, Image as ImageIcon, HeartHandshake } from 'lucide-react';
import { MedicationRequest, PharmacyOffer } from '../types';
import { cn } from '../lib/utils';
import { db, auth, storage } from '../firebase';
import { COMMON_MEDICINES } from '../data/medicines';
import { collection, addDoc, onSnapshot, query, orderBy, where, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
  const [donorDonations, setDonorDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLocation, setFilterLocation] = useState(user.role === 'pharmacist' ? user.location : '');
  const [searchQuery, setSearchQuery] = useState('');
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [pharmacistTab, setPharmacistTab] = useState<'pending' | 'handled'>('pending');
  
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
    let unsubscribeDonations: () => void;

    if (user.role === 'donor') {
      const dq = query(
        collection(db, 'medication_donations'),
        where('donorUid', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      unsubscribeDonations = onSnapshot(dq, (snapshot) => {
        const fetchedDonations = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setDonorDonations(fetchedDonations);
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'medication_donations');
      });
      return () => unsubscribeDonations && unsubscribeDonations();
    } else if (user.role === 'pharmacist') {
      if (pharmacistTab === 'pending') {
        if (filterLocation) {
          q = query(
            collection(db, 'medication_requests'),
            where('location', '==', filterLocation),
            where('status', '==', 'pending'),
            orderBy('createdAt', 'desc')
          );
        } else {
          q = query(
            collection(db, 'medication_requests'),
            where('status', '==', 'pending'),
            orderBy('createdAt', 'desc')
          );
        }
      } else {
        q = query(
          collection(db, 'medication_requests'),
          where('pharmacistUid', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
      }
    } else {
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
  }, [user, filterLocation, pharmacistTab]);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      let prescriptionUrl = '';
      if (prescriptionFile) {
        const storageRef = ref(storage, `prescriptions/${user.uid}/${Date.now()}_${prescriptionFile.name}`);
        await uploadBytes(storageRef, prescriptionFile);
        prescriptionUrl = await getDownloadURL(storageRef);
      }

      const requestData = {
        patientUid: user.uid,
        patientName: user.name,
        ...newRequest,
        prescriptionUrl,
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
      setPrescriptionFile(null);
      toast.success('تم نشر طلبك بنجاح!');
    } catch (error) {
      toast.error('حدث خطأ أثناء نشر الطلب');
      handleFirestoreError(error, OperationType.CREATE, 'medication_requests');
    } finally {
      setIsUploading(false);
    }
  };

  const handleProvideMedication = async (request: MedicationRequest) => {
    try {
      const requestRef = doc(db, 'medication_requests', request.id);
      await setDoc(requestRef, { 
        status: 'found',
        pharmacistUid: user.uid,
        pharmacistName: user.name
      }, { merge: true });
      
      // Create notification for the patient
      await addDoc(collection(db, 'notifications'), {
        userId: request.patientUid,
        title: 'تم العثور على دوائك!',
        message: `صيدلية ${user.name} توفر دواء ${request.medicationName}.`,
        type: 'success',
        read: false,
        createdAt: Date.now()
      });

      toast.success('تم إرسال ردك للمريض!');
    } catch (error) {
      toast.error('حدث خطأ أثناء الرد');
      handleFirestoreError(error, OperationType.UPDATE, `medication_requests/${request.id}`);
    }
  };

  const handleCompleteRequest = async (request: MedicationRequest) => {
    try {
      const requestRef = doc(db, 'medication_requests', request.id);
      await setDoc(requestRef, { status: 'completed' }, { merge: true });
      
      // Create notification for the patient
      await addDoc(collection(db, 'notifications'), {
        userId: request.patientUid,
        title: 'تم تسليم الدواء',
        message: `تم تأكيد تسليم دواء ${request.medicationName} من قبل صيدلية ${user.name}. نتمنى لك الشفاء العاجل!`,
        type: 'success',
        read: false,
        createdAt: Date.now()
      });

      toast.success('تم تحديث حالة الطلب إلى مكتمل!');
    } catch (error) {
      toast.error('حدث خطأ أثناء تحديث الحالة');
      handleFirestoreError(error, OperationType.UPDATE, `medication_requests/${request.id}`);
    }
  };

  const filteredRequests = requests.filter(req => 
    req.medicationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.medicalInfo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (user.role === 'donor') {
    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">لوحة تحكم المتبرع</h1>
            <p className="text-gray-500 dark:text-gray-400">إدارة تبرعاتك بالأدوية</p>
          </div>
          <Link
            to="/donations"
            className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-lg shadow-emerald-200 dark:shadow-none"
          >
            <Plus className="w-5 h-5" />
            إضافة تبرع جديد
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {donorDonations.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-[3rem] border border-dashed border-gray-200 dark:border-gray-800">
              <div className="bg-gray-50 dark:bg-gray-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <HeartHandshake className="w-10 h-10 text-gray-300 dark:text-gray-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">لا توجد تبرعات حالياً</h3>
              <p className="text-gray-500 dark:text-gray-400">ابدأ بإضافة أول تبرع لك لمساعدة المحتاجين</p>
            </div>
          ) : (
            donorDonations.map((donation) => (
              <motion.div
                key={donation.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm"
              >
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-50 dark:bg-emerald-900/30 p-2 rounded-xl">
                        <Pill className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{donation.medicationName}</h3>
                        <div className="flex items-center gap-2 text-sm">
                          {donation.status === 'claimed' ? (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-md font-medium">تم الحجز</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-md font-medium">متاح للتبرع</span>
                          )}
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-500 dark:text-gray-400">{new Date(donation.createdAt).toLocaleDateString('ar-DZ')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <Package className="w-4 h-4 text-emerald-500" />
                        <span>الكمية: {donation.quantity}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <Clock className="w-4 h-4 text-emerald-500" />
                        <span dir="ltr">انتهاء: {donation.expiryDate}</span>
                      </div>
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

  if (user.role === 'pharmacist') {
    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">طلبات الأدوية المفقودة</h1>
            <p className="text-gray-500 dark:text-gray-400">ساعد المرضى في العثور على أدويتهم</p>
          </div>
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            <button
              onClick={() => setPharmacistTab('pending')}
              className={cn(
                "px-6 py-2 rounded-lg text-sm font-bold transition-colors",
                pharmacistTab === 'pending'
                  ? "bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              )}
            >
              الطلبات الجديدة
            </button>
            <button
              onClick={() => setPharmacistTab('handled')}
              className={cn(
                "px-6 py-2 rounded-lg text-sm font-bold transition-colors",
                pharmacistTab === 'handled'
                  ? "bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              )}
            >
              طلباتي
            </button>
          </div>
        </div>

        {pharmacistTab === 'pending' && (
          <div className="flex flex-col sm:flex-row gap-3 justify-end mt-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="بحث عن دواء..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 pr-10 pl-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:text-white"
              />
            </div>
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:text-white"
            >
              <option value="">كل الولايات</option>
              <option value="الجزائر">الجزائر</option>
              <option value="وهران">وهران</option>
              <option value="قسنطينة">قسنطينة</option>
              <option value="عنابة">عنابة</option>
              <option value="باتنة">باتنة</option>
              <option value="سطيف">سطيف</option>
              <option value="تلمسان">تلمسان</option>
              <option value="البليدة">البليدة</option>
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-[3rem] border border-dashed border-gray-200 dark:border-gray-800">
              <div className="bg-gray-50 dark:bg-gray-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Pill className="w-10 h-10 text-gray-300 dark:text-gray-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">لا توجد طلبات جديدة</h3>
              <p className="text-gray-500 dark:text-gray-400">سيظهر هنا أي طلب دواء جديد</p>
            </div>
          ) : (
            filteredRequests.map((req) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row justify-between gap-6">
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-50 dark:bg-emerald-900/30 p-2 rounded-xl">
                        <Pill className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{req.medicationName}</h3>
                          {req.urgency === 'critical' && (
                            <span className="animate-pulse bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">حالة حرجة</span>
                          )}
                          {req.urgency === 'urgent' && (
                            <span className="bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">مستعجل</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">بواسطة: {req.patientName}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <Package className="w-4 h-4 text-emerald-500" />
                        <span>{req.boxes} علب</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <MapPin className="w-4 h-4 text-emerald-500" />
                        <span>{req.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <Clock className="w-4 h-4 text-emerald-500" />
                        <span>{new Date(req.createdAt).toLocaleTimeString('ar-DZ')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <Send className="w-4 h-4 text-emerald-500" />
                        <span>{req.deliveryMethod === 'pickup' ? 'استلام' : 'توصيل'}</span>
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">المعلومات الطبية والجرعة:</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{req.medicalInfo} - {req.dosage}</p>
                    </div>
                    
                    {req.prescriptionUrl && (
                      <div className="mt-2">
                        <a href={req.prescriptionUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300">
                          <ImageIcon className="w-4 h-4" />
                          عرض الوصفة الطبية
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="flex md:flex-col justify-end gap-3">
                    {req.status === 'pending' && (
                      <>
                        <button 
                          onClick={() => handleProvideMedication(req)}
                          className="flex-1 md:flex-none bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-colors"
                        >
                          متوفر لدي
                        </button>
                        <button className="flex-1 md:flex-none bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 px-6 py-3 rounded-2xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          مراسلة
                        </button>
                      </>
                    )}
                    {req.status === 'found' && (
                      <button 
                        onClick={() => handleCompleteRequest(req)}
                        className="flex-1 md:flex-none bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        تأكيد التسليم
                      </button>
                    )}
                    {req.status === 'completed' && (
                      <div className="flex-1 md:flex-none bg-gray-100 dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-5 h-5" />
                        مكتمل
                      </div>
                    )}
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">طلباتي</h1>
          <p className="text-gray-500 dark:text-gray-400">تتبع حالة طلبات الأدوية الخاصة بك</p>
        </div>
        <button
          onClick={() => setShowNewRequest(true)}
          className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 dark:shadow-none"
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
            <motion.div className="bg-white dark:bg-gray-900 w-full max-w-xl rounded-[2.5rem] p-8 space-y-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">طلب دواء جديد</h2>
                <button 
                  onClick={() => setShowNewRequest(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <Plus className="w-6 h-6 rotate-45 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleCreateRequest} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mr-1">مستوى الاستعجال</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'normal', label: 'عادي', color: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300' },
                      { id: 'urgent', label: 'مستعجل', color: 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/30 dark:border-orange-800 dark:text-orange-300' },
                      { id: 'critical', label: 'حالة حرجة', color: 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300' }
                    ].map((level) => (
                      <button
                        key={level.id}
                        type="button"
                        onClick={() => setNewRequest({ ...newRequest, urgency: level.id as any })}
                        className={cn(
                          "py-3 rounded-xl font-bold text-xs transition-all border-2",
                          newRequest.urgency === level.id 
                            ? level.color 
                            : "bg-gray-50 dark:bg-gray-800 border-transparent text-gray-500 dark:text-gray-400"
                        )}
                      >
                        {level.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mr-1">اسم الدواء</label>
                  <div className="relative">
                    <Pill className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      required
                      type="text"
                      list="medicines-list"
                      placeholder="مثال: Ventoline, Panadol..."
                      className="w-full pr-12 pl-4 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
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
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mr-1">الجرعة</label>
                    <input
                      required
                      type="text"
                      placeholder="مثال: 500mg"
                      className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                      value={newRequest.dosage}
                      onChange={e => setNewRequest({ ...newRequest, dosage: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mr-1">عدد العلب</label>
                    <input
                      required
                      type="number"
                      min="1"
                      className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                      value={newRequest.boxes}
                      onChange={e => setNewRequest({ ...newRequest, boxes: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mr-1">المعلومات الطبية</label>
                  <textarea
                    required
                    placeholder="اذكر حالتك الطبية أو أي ملاحظات إضافية..."
                    rows={3}
                    className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all resize-none dark:text-white"
                    value={newRequest.medicalInfo}
                    onChange={e => setNewRequest({ ...newRequest, medicalInfo: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mr-1">صورة الوصفة الطبية (اختياري)</label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setPrescriptionFile(e.target.files?.[0] || null)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 dark:file:bg-emerald-900/30 dark:file:text-emerald-400"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mr-1">طريقة الاستلام</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setNewRequest({ ...newRequest, deliveryMethod: 'pickup' })}
                      className={cn(
                        "py-4 rounded-2xl font-bold transition-all border-2",
                        newRequest.deliveryMethod === 'pickup' 
                          ? "bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
                          : "bg-gray-50 border-transparent text-gray-500 dark:bg-gray-800 dark:text-gray-400"
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
                          ? "bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
                          : "bg-gray-50 border-transparent text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                      )}
                    >
                      توصيل للمنزل
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isUploading}
                  className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'جاري النشر...' : 'نشر الطلب'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-6">
        {requests.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-[3rem] border border-dashed border-gray-200 dark:border-gray-800">
            <div className="bg-gray-50 dark:bg-gray-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <ClipboardList className="w-10 h-10 text-gray-300 dark:text-gray-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">لا توجد طلبات حالياً</h3>
            <p className="text-gray-500 dark:text-gray-400">ابدأ بإضافة أول طلب دواء لك</p>
          </div>
        ) : (
          requests.map((req) => (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm"
            >
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-50 dark:bg-emerald-900/30 p-2 rounded-xl">
                      <Pill className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{req.medicationName}</h3>
                        {req.urgency === 'critical' && (
                          <span className="animate-pulse bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">حالة حرجة</span>
                        )}
                        {req.urgency === 'urgent' && (
                          <span className="bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">مستعجل</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {req.status === 'completed' ? (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-md font-medium">مكتمل</span>
                        ) : req.status === 'found' ? (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-md font-medium">تم العثور عليه</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-md font-medium">قيد البحث</span>
                        )}
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-500 dark:text-gray-400">{new Date(req.createdAt).toLocaleDateString('ar-DZ')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <Package className="w-4 h-4 text-emerald-500" />
                      <span>{req.boxes} علب ({req.dosage})</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <Send className="w-4 h-4 text-emerald-500" />
                      <span>{req.deliveryMethod === 'pickup' ? 'استلام' : 'توصيل'}</span>
                    </div>
                  </div>
                  
                  {req.prescriptionUrl && (
                    <div className="mt-2">
                      <a href={req.prescriptionUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300">
                        <ImageIcon className="w-4 h-4" />
                        عرض الوصفة الطبية
                      </a>
                    </div>
                  )}
                </div>

                <div className={cn(
                  "flex items-center gap-4 p-4 rounded-2xl border",
                  req.status === 'completed'
                    ? "bg-blue-50/50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-900/30"
                    : req.status === 'found' 
                    ? "bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-900/30" 
                    : "bg-gray-50 border-gray-100 dark:bg-gray-800 dark:border-gray-700"
                )}>
                  <div className={cn(
                    "p-2 rounded-full",
                    req.status === 'completed' ? "bg-blue-500" : req.status === 'found' ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"
                  )}>
                    {req.status === 'completed' ? <CheckCircle2 className="w-5 h-5 text-white" /> : <MessageSquare className="w-5 h-5 text-white" />}
                  </div>
                  <div>
                    <p className={cn(
                      "text-sm font-bold",
                      req.status === 'completed' ? "text-blue-900 dark:text-blue-400" : req.status === 'found' ? "text-emerald-900 dark:text-emerald-400" : "text-gray-700 dark:text-gray-300"
                    )}>
                      {req.status === 'completed' ? 'تم التسليم' : req.status === 'found' ? 'يوجد رد!' : '0 ردود'}
                    </p>
                    <p className={cn(
                      "text-xs",
                      req.status === 'completed' ? "text-blue-700 dark:text-blue-500" : req.status === 'found' ? "text-emerald-700 dark:text-emerald-500" : "text-gray-500 dark:text-gray-400"
                    )}>
                      {req.status === 'completed' ? 'نتمنى لك الشفاء العاجل' : req.status === 'found' ? 'يرجى التحقق من الإشعارات' : 'بانتظار رد الصيادلة...'}
                    </p>
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
