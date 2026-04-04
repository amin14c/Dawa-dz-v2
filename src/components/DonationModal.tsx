import React, { useState } from 'react';
import { X, Upload, HeartHandshake, Pill } from 'lucide-react';
import { db, storage } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { UserProfile } from '../types';
import { COMMON_MEDICINES } from '../data/medicines';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
}

export function DonationModal({ isOpen, onClose, user }: DonationModalProps) {
  const [medicationName, setMedicationName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [donorType, setDonorType] = useState<'individual' | 'charity'>('individual');
  const [location, setLocation] = useState(user?.location || '');
  const [contactPhone, setContactPhone] = useState(user?.phone || '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);

    try {
      let imageUrl = '';
      if (imageFile) {
        const imageRef = ref(storage, `donations/${Date.now()}_${imageFile.name}`);
        await uploadBytes(imageRef, imageFile);
        imageUrl = await getDownloadURL(imageRef);
      }

      await addDoc(collection(db, 'medication_donations'), {
        donorUid: user.uid,
        donorName: user.name,
        donorType,
        medicationName,
        quantity,
        expiryDate,
        location,
        contactPhone,
        status: 'available',
        imageUrl: imageUrl || null,
        createdAt: Date.now()
      });

      setMedicationName('');
      setQuantity('');
      setExpiryDate('');
      setDonorType('individual');
      setImageFile(null);
      onClose();
    } catch (error) {
      console.error('Error adding donation:', error);
      alert('حدث خطأ أثناء إضافة التبرع. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <HeartHandshake className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">إضافة تبرع بدواء</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form id="donation-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                نوع المتبرع
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="donorType"
                    value="individual"
                    checked={donorType === 'individual'}
                    onChange={(e) => setDonorType(e.target.value as 'individual' | 'charity')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">فرد</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="donorType"
                    value="charity"
                    checked={donorType === 'charity'}
                    onChange={(e) => setDonorType(e.target.value as 'individual' | 'charity')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">جمعية خيرية</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                اسم الدواء
              </label>
              <div className="relative">
                <Pill className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  required
                  list="donation-medicines-list"
                  value={medicationName}
                  onChange={(e) => setMedicationName(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  placeholder="مثال: Paracetamol 500mg"
                />
                <datalist id="donation-medicines-list">
                  {COMMON_MEDICINES.map((med, index) => (
                    <option key={index} value={med} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  الكمية
                </label>
                <input
                  type="text"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                  placeholder="مثال: علبتين"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  تاريخ انتهاء الصلاحية
                </label>
                <input
                  type="month"
                  required
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                الولاية / المنطقة
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                رقم الهاتف للتواصل
              </label>
              <input
                type="tel"
                required
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-left"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                صورة الدواء (اختياري)
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-xl hover:border-emerald-500 dark:hover:border-emerald-400 transition-colors">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600 dark:text-gray-400 justify-center">
                    <label
                      htmlFor="donation-image-upload"
                      className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 focus-within:outline-none"
                    >
                      <span>اختر صورة</span>
                      <input id="donation-image-upload" name="donation-image-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    PNG, JPG, GIF حتى 5MB
                  </p>
                  {imageFile && (
                    <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mt-2">
                      تم اختيار: {imageFile.name}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              إلغاء
            </button>
            <button
              type="submit"
              form="donation-form"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'إضافة التبرع'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
