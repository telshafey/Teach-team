import React from "react";
import { useSettingsContext } from "@shared/contexts/SettingsContext";
import {
  InformationCircleIcon,
  HomeIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  UsersIcon,
  VideoCameraIcon,
  UserIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  BellIcon,
  TicketIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  DocumentDuplicateIcon,
} from "../ui/Icons";

export const OnboardingPage: React.FC = () => {
  const { siteSettings } = useSettingsContext();

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto pb-24">
      <div className="mb-10 text-center">
        <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-4">
          الدليل التعريفي للمنصة
        </h1>
        <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-lg">
          مرحباً بك في فريقنا! يوفر لك هذا الدليل نظرة شاملة على كيفية استخدام
          ميزات المنصة الأساسية لتسهيل عملك اليومي والبقاء على تواصل مع زملائك.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Section */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <UserIcon className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              الملف الشخصي
            </h2>
          </div>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
            تأكد من إعداد ملفك الشخصي عبر القائمة الجانبية. يمكنك تحديث صورتك
            الشخصية، معلومات الاتصال، ومتابعة سجل نشاطك. ملفك الشخصي يساعد
            زملائك في التعرف عليك والتواصل معك بسهولة.
          </p>
        </div>

        {/* Dashboard Section */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-lg">
              <HomeIcon className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              لوحة التحكم (الرئيسية)
            </h2>
          </div>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
            لوحة التحكم هي واجهتك الأساسية والأولى. من خلالها تستطيع الاطلاع على
            ملخص أدائك، مهامك السريعة، وإحصائيات الحضور. تختلف محتويات اللوحة
            بناءً على صلاحياتك، حيث يرى المدراء إحصائيات فرقهم أيضاً.
          </p>
        </div>

        {/* Clock & Timesheet Section */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <ClockIcon className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              الحضور وسجل العمل
            </h2>
          </div>
          <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 leading-relaxed text-sm space-y-2">
            <li>
              <strong>تسجيل الحضور:</strong> لا تنسَ تسجيل الحضور من الشريط
              العلوي عند بدء يومك.
            </li>
            <li>
              <strong>تتبع وقت المهام:</strong> استخدم زر البدء والايقاف لتتبع
              الوقت المباشر المستغرق في كل مهمة.
            </li>
            <li>
              <strong>سجل الدوام (Timesheet):</strong> راجع ساعات عملك وقم
              بتقديم السجل اليومي لمشاريعك بشكل دوري.
            </li>
          </ul>
        </div>

        {/* Tasks & Projects Section */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
              <ClipboardDocumentListIcon className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              المشاريع والمهام
            </h2>
          </div>
          <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 leading-relaxed text-sm space-y-2">
            <li>
              <strong>المشاريع:</strong> تعرض المشاريع التي تعمل عليها أنت أو
              فريقك المباشر.
            </li>
            <li>
              <strong>مهامي:</strong> قائمة مركزة بالمهام المُسندة إليك شخصياً
              لسهولة المتابعة والإنجاز.
            </li>
            <li>
              <strong>لوحة المهام (Kanban):</strong> استخدم السحب والإفلات
              لتغيير حالات مهامك.
            </li>
          </ul>
        </div>

        {/* Hierarchy & Team Section */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg">
              <UsersIcon className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              فريق العمل والمدراء
            </h2>
          </div>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
            المنصة تدعم الهيكل الإداري بالكامل. سترى الزملاء الذين تعمل معهم
            بشكل منتظم فقط. إذا كنت مديراً، ستتمكن من رؤية فريقك، تقييم أدائهم،
            متابعة تقدمهم، واعتماد طلباتهم بكل سهولة من خلال شاشات الإدارة.
          </p>
        </div>

        {/* Approvals & Requests Section */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-lg">
              <DocumentTextIcon className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              الطلبات والموافقات
            </h2>
          </div>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm mb-2">
            من خلال تبويب "الموافقات"، يمكنك تقديم ومتابعة:
          </p>
          <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 leading-relaxed text-sm space-y-1">
            <li>
              <strong>الإجازات:</strong> التقدم بطلب إجازة دورية أو مرضية
              للموافقة عليها.
            </li>
            <li>
              <strong>العمل الإضافي:</strong> طلب توثيق واعتماد ساعات العمل خارج
              الدوام الرسمي.
            </li>
          </ul>
        </div>

        {/* Finance Section */}
        {siteSettings?.isFinanceModuleEnabled && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                <CurrencyDollarIcon className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                المالية والمصروفات
              </h2>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
              إذا كان لديك مصاريف متعلقة بالعمل (Expense Claims)، يمكنك تقديمها
              عبر النظام لإدارتك و قسم المالية لاعتمادها وصرفها لك بناءً على
              الدورة المستندية الخاصة بالشركة.
            </p>
          </div>
        )}

        {/* Meetings Section */}
        {siteSettings?.isMeetingsModuleEnabled && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg">
                <VideoCameraIcon className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                الاجتماعات المباشرة
              </h2>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
              لا داعي لاستخدام برامج خارجية! يمكنك جدولة الاجتماعات والانضمام
              لغرفة فيديو آمنة ومباشرة مع فريقك، مع ميزات المحادثة النصية
              والمشاركة الفعالة لضمان أفضل إنتاجية.
            </p>
          </div>
        )}

        {/* Analytics Section */}
        {siteSettings?.isAnalyticsModuleEnabled && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-600 dark:text-fuchsia-400 rounded-lg">
                <ChartBarIcon className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                التحليلات والمقاييس
              </h2>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
              تصفح لوحة التحليلات الخاصة بك لمتابعة أداءك العام ولتحليل ساعات
              عملك وإنتاجيتك بشكل مرئي سريع الفهم. يستطيع المدراء الاطلاع على
              تحليلات و إحصائيات فرق العمل التابعة لهم.
            </p>
          </div>
        )}

        {/* Reports Section */}
        {siteSettings?.isReportsModuleEnabled && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-lg">
                <DocumentDuplicateIcon className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                التقارير المتقدمة
              </h2>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
              يوفر لك قسم التقارير مرونة عالية في تخصيص وبناء تقارير خاصة بساعات
              العمل، الحضور، وتكاليف المشاريع وحفظها للوصول السريع، مع إمكانية
              تصديرها للمشاركة مع الإدارة أو أطراف أخرى.
            </p>
          </div>
        )}
      </div>

      {/* Notifications & Penalties (Full Width) */}
      <div className="mt-6 bg-amber-50 dark:bg-amber-900/10 p-6 rounded-xl border border-amber-200 dark:border-amber-900/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
            <BellIcon className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            الإشعارات والتنبيهات
          </h2>
        </div>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
          تابع زر الإشعارات الموجود أعلى يمين الشاشة. ستقوم المنصة بتنبيهك بكل
          تحديث مهم مثل: المهام الجديدة الموكلة لك، حالة الموافقة على رصيد
          إجازتك، والاجتماعات المقتربة للبدء، وحتى الإنذارات أو الجزاءات إن
          وجدت.
        </p>
      </div>

      {/* Support Help Section (Full Width) */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/10 p-6 rounded-xl border border-blue-200 dark:border-blue-900/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg">
            <TicketIcon className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            كيف أحصل على الدعم؟
          </h2>
        </div>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
          نعلم أن الأنظمة الجديدة قد تأخذ بعض الوقت للتعود عليها. إذا واجهتك أي
          مشكلة تقنية، خطأ برمجي، أو احتجت لاستفسار، توجه لقسم{" "}
          <strong>الدعم الفني</strong> وافتح تذكرة جديدة وسيقوم فريق الدعم
          بمساعدتك فوراً.
        </p>
      </div>

      <div className="mt-12 text-center text-slate-500 text-sm">
        <p>تم إعداد هذا الدليل لمساعدتك على بيئة العمل بشكل أكثر فاعلية.</p>
        <p>نتمنى لك إنجازات مستمرة!</p>
      </div>
    </div>
  );
};
