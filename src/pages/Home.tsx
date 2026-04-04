import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Pill, Search, ShieldCheck, Clock, MapPin, Info, AlertTriangle, CheckCircle, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { PlatformSettings } from '../types';

export function Home() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'platform_settings', 'main'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as PlatformSettings);
      }
    });
    return () => unsub();
  }, []);

  const getBannerStyles = (type: string) => {
    switch (type) {
      case 'warning': return 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800';
      case 'success': return 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800';
      case 'holiday': return 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800';
      default: return 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
    }
  };

  const getBannerIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-6 h-6" />;
      case 'success': return <CheckCircle className="w-6 h-6" />;
      case 'holiday': return <Star className="w-6 h-6" />;
      default: return <Info className="w-6 h-6" />;
    }
  };

  return (
    <div className="space-y-12 py-6">
      <AnimatePresence>
        {settings?.bannerActive && settings.bannerMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-4 rounded-2xl border flex items-start gap-4 ${getBannerStyles(settings.bannerType)}`}
          >
            <div className="shrink-0 mt-0.5">
              {getBannerIcon(settings.bannerType)}
            </div>
            <p className="font-medium leading-relaxed whitespace-pre-wrap">
              {settings.bannerMessage}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="text-center space-y-8 max-w-3xl mx-auto pt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-4 py-1.5 rounded-full text-sm font-medium border border-emerald-100 dark:border-emerald-800"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          نحن هنا لمساعدتك في العثور على دوائك
        </motion.div>
        
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl md:text-6xl font-extrabold text-gray-900 dark:text-white leading-tight"
        >
          منصة <span className="text-emerald-600 dark:text-emerald-400">Dawa DZ</span> لربط المرضى بالصيادلة
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed"
        >
          أول منصة جزائرية متخصصة في مساعدة المرضى في بحثهم عن الأدوية المفقودة. 
          اطلب دواءك الآن وسيقوم الصيادلة في منطقتك بالرد عليك.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
        >
          <Link
            to="/auth"
            className="w-full sm:w-auto bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 dark:shadow-none hover:-translate-y-1"
          >
            اطلب دواءك الآن
          </Link>
          <Link
            to="/auth"
            className="w-full sm:w-auto bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-2 border-gray-100 dark:border-gray-700 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all hover:border-emerald-200 dark:hover:border-emerald-800"
          >
            أنا صيدلي
          </Link>
        </motion.div>
      </section>

      {/* Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12">
        {[
          {
            icon: <Search className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />,
            title: "سهولة البحث",
            desc: "أدخل اسم الدواء ومعلوماتك الطبية وسنقوم بنشر طلبك فوراً."
          },
          {
            icon: <ShieldCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />,
            title: "صيادلة معتمدون",
            desc: "يتم التحقق من هوية الصيادلة لضمان جودة الخدمة وسلامة الأدوية."
          },
          {
            icon: <Clock className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />,
            title: "استجابة سريعة",
            desc: "تلقى عروضاً من الصيدليات القريبة منك في وقت قياسي."
          }
        ].map((feature, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.1 }}
            className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors group"
          >
            <div className="bg-emerald-50 dark:bg-emerald-900/30 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              {feature.icon}
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{feature.title}</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{feature.desc}</p>
          </motion.div>
        ))}
      </section>

      {/* Stats */}
      <section className="bg-emerald-600 dark:bg-emerald-800 rounded-[3rem] p-12 text-white overflow-hidden relative mt-12">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          <div>
            <div className="text-4xl font-bold mb-2">+500</div>
            <div className="text-emerald-100 dark:text-emerald-200">صيدلية مسجلة</div>
          </div>
          <div>
            <div className="text-4xl font-bold mb-2">+2000</div>
            <div className="text-emerald-100 dark:text-emerald-200">دواء تم توفيره</div>
          </div>
          <div>
            <div className="text-4xl font-bold mb-2">58</div>
            <div className="text-emerald-100 dark:text-emerald-200">ولاية مغطاة</div>
          </div>
        </div>
      </section>
    </div>
  );
}
