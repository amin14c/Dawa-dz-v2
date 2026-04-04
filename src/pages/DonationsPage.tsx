import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { MedicationDonation, UserProfile } from '../types';
import { HeartHandshake, MapPin, Calendar, Phone, Search, Plus, CheckCircle2 } from 'lucide-react';
import { DonationModal } from '../components/DonationModal';

interface DonationsPageProps {
  user: UserProfile | null;
}

export function DonationsPage({ user }: DonationsPageProps) {
  const [donations, setDonations] = useState<MedicationDonation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'medication_donations'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const donationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MedicationDonation[];
      setDonations(donationsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredDonations = donations.filter(donation => 
    donation.medicationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    donation.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleClaim = async (donationId: string) => {
    if (!user) {
      alert('يجب تسجيل الدخول أولاً');
      return;
    }
    if (window.confirm('هل أنت متأكد أنك تريد حجز هذا التبرع؟ يرجى التواصل مع المتبرع بعد الحجز.')) {
      try {
        await updateDoc(doc(db, 'medication_donations', donationId), {
          status: 'claimed'
        });
        alert('تم حجز التبرع بنجاح. يرجى التواصل مع المتبرع في أقرب وقت.');
      } catch (error) {
        console.error('Error claiming donation:', error);
        alert('حدث خطأ أثناء حجز التبرع.');
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <HeartHandshake className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            التبرع بالأدوية
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            أدوية مجانية متوفرة من متبرعين وجمعيات خيرية
          </p>
        </div>
        
        {user && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-lg shadow-emerald-200 dark:shadow-none"
          >
            <Plus className="w-5 h-5" />
            إضافة تبرع
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
        <div className="relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="ابحث عن دواء أو ولاية..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-12 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
        </div>
      ) : filteredDonations.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <HeartHandshake className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">لا توجد تبرعات حالياً</h3>
          <p className="text-gray-500 dark:text-gray-400">
            {searchTerm ? 'لم يتم العثور على نتائج للبحث' : 'كن أول من يتبرع بدواء لمساعدة الآخرين'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDonations.map((donation) => (
            <div key={donation.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
              {donation.imageUrl && (
                <div className="h-48 w-full overflow-hidden bg-gray-100 dark:bg-gray-700">
                  <img 
                    src={donation.imageUrl} 
                    alt={donation.medicationName} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                      {donation.medicationName}
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300">
                      {donation.donorType === 'charity' ? 'جمعية خيرية' : 'متبرع فردي'}
                    </span>
                  </div>
                  {donation.status === 'claimed' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                      تم الحجز
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                      متوفر
                    </span>
                  )}
                </div>

                <div className="space-y-3 mb-6 flex-1">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 text-sm">
                    <span className="font-semibold w-20">الكمية:</span>
                    <span>{donation.quantity}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 text-sm">
                    <Calendar className="w-4 h-4 text-emerald-500" />
                    <span className="font-semibold">تاريخ الانتهاء:</span>
                    <span dir="ltr">{donation.expiryDate}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 text-sm">
                    <MapPin className="w-4 h-4 text-emerald-500" />
                    <span>{donation.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 text-sm">
                    <Phone className="w-4 h-4 text-emerald-500" />
                    <span dir="ltr">{donation.contactPhone}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-gray-700 mt-auto">
                  {donation.status === 'available' ? (
                    <button
                      onClick={() => handleClaim(donation.id)}
                      className="w-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 py-2.5 rounded-xl font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      حجز الدواء
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 py-2.5 rounded-xl font-medium cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      غير متوفر حالياً
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <DonationModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        user={user} 
      />
    </div>
  );
}
