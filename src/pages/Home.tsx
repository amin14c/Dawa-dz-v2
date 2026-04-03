import React from 'react';
import { motion } from 'motion/react';
import { Pill, Search, ShieldCheck, Clock, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Home() {
  return (
    <div className="space-y-20 py-10">
      {/* Hero Section */}
      <section className="text-center space-y-8 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-medium border border-emerald-100"
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
          className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight"
        >
          منصة <span className="text-emerald-600">Dawa DZ</span> لربط المرضى بالصيادلة
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg text-gray-600 leading-relaxed"
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
            className="w-full sm:w-auto bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 hover:-translate-y-1"
          >
            اطلب دواءك الآن
          </Link>
          <Link
            to="/auth"
            className="w-full sm:w-auto bg-white text-gray-700 border-2 border-gray-100 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-gray-50 transition-all hover:border-emerald-200"
          >
            أنا صيدلي
          </Link>
        </motion.div>
      </section>

      {/* Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          {
            icon: <Search className="w-8 h-8 text-emerald-600" />,
            title: "سهولة البحث",
            desc: "أدخل اسم الدواء ومعلوماتك الطبية وسنقوم بنشر طلبك فوراً."
          },
          {
            icon: <ShieldCheck className="w-8 h-8 text-emerald-600" />,
            title: "صيادلة معتمدون",
            desc: "يتم التحقق من هوية الصيادلة لضمان جودة الخدمة وسلامة الأدوية."
          },
          {
            icon: <Clock className="w-8 h-8 text-emerald-600" />,
            title: "استجابة سريعة",
            desc: "تلقى عروضاً من الصيدليات القريبة منك في وقت قياسي."
          }
        ].map((feature, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.1 }}
            className="bg-white p-8 rounded-3xl border border-gray-100 hover:border-emerald-200 transition-colors group"
          >
            <div className="bg-emerald-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              {feature.icon}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
            <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
          </motion.div>
        ))}
      </section>

      {/* Stats */}
      <section className="bg-emerald-600 rounded-[3rem] p-12 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          <div>
            <div className="text-4xl font-bold mb-2">+500</div>
            <div className="text-emerald-100">صيدلية مسجلة</div>
          </div>
          <div>
            <div className="text-4xl font-bold mb-2">+2000</div>
            <div className="text-emerald-100">دواء تم توفيره</div>
          </div>
          <div>
            <div className="text-4xl font-bold mb-2">58</div>
            <div className="text-emerald-100">ولاية مغطاة</div>
          </div>
        </div>
      </section>
    </div>
  );
}
