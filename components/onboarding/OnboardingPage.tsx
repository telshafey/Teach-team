import React from "react";
import { useSettingsContext } from "@shared/contexts/SettingsContext";
import { useAuth } from "@shared/contexts/AuthContext";
import { useTeamContext } from "@shared/contexts/TeamContext";
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
  const { currentUser } = useAuth();
  const { hasPermission } = useTeamContext();

  const role = currentUser?.roleId;
  const isGM = role === "gm" || role === "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d";
  const isManager = role === "manager";
  const isFreelancer = role === "freelancer";
  const isEmployee = !isGM && !isManager && !isFreelancer;
  const isManagerOrAbove = isGM || isManager;

  const canApprove =
    hasPermission("approve_task_submissions") ||
    hasPermission("approve_weekly_plans") ||
    hasPermission("approve_leave_requests") ||
    hasPermission("approve_overtime") ||
    hasPermission("approve_freelancer_contracts") ||
    hasPermission("approve_expense_claims") ||
    hasPermission("approve_work_contract_changes") ||
    hasPermission("approve_penalties");

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto pb-24">
      <div className="mb-10 text-center">
        <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-4">
          الدليل التعريفي الخاص بك
        </h1>
        <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-lg">
          مرحباً {currentUser?.name}! هذا الدليل مصمم خصيصاً ليناسب دورك كـ{" "}
          <strong className="text-slate-800 dark:text-slate-200">
            {isGM ? "المدير العام للإدارة" : isManager ? "مدير فريق" : isFreelancer ? "مستقل (Freelancer)" : "موظف"}
          </strong>
          . تعرف على ميزات المنصة وكيف تؤدي مهام عملك اليومية بكفاءة عالية.
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
            يمكنك إعداد ملفك الشخصي عبر القائمة الجانبية لتحديث صورتك الشخصية ومعلومات الاتصال. 
            {isFreelancer 
              ? " سيساعد هذا الإدارة في متابعة بيانات التواصل معك وتقييم أدائك كمستقل."
              : " ملفك الشخصي يساعد زملائك في التعرف عليك وسهولة التواصل معك."}
          </p>
        </div>

        {/* Dashboard Section */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-lg">
              <HomeIcon className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              اللوحة الرئيسية
            </h2>
          </div>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
            {isGM && "اللوحة الرئيسية توفر لك نظرة شاملة على أداء الشركة ككل (المالية، حضور وانصراف الموظفين، مهام المشاريع الكبرى، والتقارير الإجمالية)."}
            {isManager && "صممت اللوحة الرئيسية لتُظهر لك ملخص أداء فريقك، حضور موظفيك، المهام المعلقة للفريق، والطلبات التي تنتظر موافقتك كمدير للحفاظ على سير العمل والتسليم."}
            {isEmployee && "اللوحة الرئيسية تُظهر ملخص أدائك الشخصي السريع لمتابعة مهامك المتبقية ومستوى إنجازك خلال الشهر."}
            {isFreelancer && "لوحتك مخصصة لتُظهر لك المهام ومسارك كمستقل للعمل على إنجازها في الوقت المحدد لك وتتبع إنجازك المادي."}
          </p>
        </div>

        {/* Clock & Timesheet Section */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <ClockIcon className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              سجل الحضور والمهام (التايم شيت)
            </h2>
          </div>
          <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 leading-relaxed text-sm space-y-2">
            {!isFreelancer && (
              <li>
                <strong>تسجيل الحضور:</strong> تسجيل الحضور لا يقتصر على التواجد فقط، بل يجب ربط ساعات العمل بالمهام والمشاريع المحددة في النظام.
              </li>
            )}
            <li>
              <strong>تتبع المهام:</strong> استخدم زر (البدء / الإيقاف) لتسجيل الوقت المستغرق في كل مهمة. ساعات العمل إما أن تُسجل على مشاريع معينة أو تُدرج كـ "مهام إدارية/أخرى".
            </li>
            <li>
              <strong>المتابعة والتقارير:</strong> يتم عرض توزيع ساعات عملك بدقة في لوحة التحكم والتقارير (لك وللإدارة) لمعرفة تكلفة ووقت كل مشروع.
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
            {isManagerOrAbove ? (
              <>
                <li>
                  <strong>المشاريع:</strong> يمكنك إنشاء المشاريع ومتابعتها، وتعيين أعضاء الفريق للمهام.
                </li>
                <li>
                  <strong>لوحة متابعة الأعمال (Kanban):</strong> ستمكنك من تحريك المهام بمراحل الإنجاز المختلفة.
                </li>
              </>
            ) : (
              <>
                <li>
                  <strong>المشاريع:</strong> تعرض المشاريع والمهام التي تم إدراجك فيها.
                </li>
                <li>
                  <strong>مهامي:</strong> قائمة مركزة لمهامك الشخصية التي يجب إنهائها وتتبعها.
                </li>
              </>
            )}
          </ul>
        </div>

        {/* Hierarchy & Team Section */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg">
              <UsersIcon className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {isManagerOrAbove ? "إدارة الفريق والأعضاء" : "فريق العمل والهيكل"}
            </h2>
          </div>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
            {isManagerOrAbove 
              ? "من خلال صفحة الفريق، تستطيع استعراض جميع أعضاء فريقك، مهام المفتوحة لديهم، وتقييم أدائهم المكتمل كما تستطيع تعديل بياناتهم الوظيفية والرواتب (للمدير العام)."
              : "ستتمكن من رؤية الهيكل التنظيمي لشركتك والتواصل بشكل مباشر مع مديرك المباشر أو رؤية زملاء القسم الذي تعمل به."}
          </p>
        </div>

        {/* Approvals & Requests Section */}
        {(!isFreelancer || canApprove) && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-lg">
                <DocumentTextIcon className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {canApprove ? "إدارة الطلبات والموافقات" : "الطلبات والموافقات"}
              </h2>
            </div>
            {canApprove ? (
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
                كصاحب قرار، ستتلقى من فريقك في هذا القسم جميع طلبات (الإجازات، العمل الإضافي، عروض المستقلين، وادعاءات المصاريف) لمراجعتها واعتمادها أو رفضها مع كتابة المبررات اللازمة.
              </p>
            ) : (
              <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 leading-relaxed text-sm space-y-1">
                <li><strong>الإجازات:</strong> التقدم بطلب إجازة دورية/مرضية للموافقة عليها.</li>
                <li><strong>العمل الإضافي:</strong> طلب توثيق واعتماد الساعات الإضافية التي عملتها.</li>
              </ul>
            )}
          </div>
        )}

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
              {isGM && "الوصول الكامل إلى سجل المصروفات، رواتب الموظفين الشهرية، والميزانيات التفصيلية للمشاريع وتكاليف عقود المستقلين وإصدار الجزاءات المادية."}
              {isManager && "تتيح لك الاطلاع على مصروفات المشاريع الخاصة بقسمك كالمصروفات و الجزاءات ضمن الحدود المسموحة لك."}
              {(!isManagerOrAbove && !isFreelancer) && "إذا كان لديك مصاريف متعلقة بالعمل (Expense Claims) قمت بصرفها من جيبك الشخصي، يمكنك طلب استردادها واعتمادها من الإدارة."}
              {isFreelancer && "منطقة المالية تتيح لك رؤية عقودك السابقة والمستحقات المعتمدة (عقودي المستقلة)."}
            </p>
          </div>
        )}

        {/* Analytics Section */}
        {siteSettings?.isAnalyticsModuleEnabled && hasPermission("view_analytics") && (
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
              {isManagerOrAbove 
                ? "تابع معدلات إنتاجية الشركة والفرق، وتعرف على توزيع المجهود (الساعات) على مختلف المشاريع والمهام الإدارية لضمان الاستقطاب الأمثل للموارد، بالإضافة لنسب المهام المكتملة والجاري العمل عليها."
                : "تصفح لوحة التحليلات لتوفير رؤى كمية لتاريخ مشاركتك، إنجازاتك وساعات عملك اليومية والشهرية."}
            </p>
          </div>
        )}

        {/* Reports Section */}
        {siteSettings?.isReportsModuleEnabled && hasPermission("view_reports") && (
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
              يوفر لك قسم التقارير مرونة عالية في استخراج الساعات المبذولة وتقسيمها حسب المشاريع أو المهام الإدارية غير المرتبطة بمشروع (المهام الأخرى)، مع القدرة على تصفيتها عبر نطاقات زمنية وتصديرها.
            </p>
          </div>
        )}

      </div>

      {/* Notifications & System Updates */}
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
          أبقِ عينك على زر الإشعارات لمتابعة التحديثات الهامة وطلبات الموافقة. النظام سيرسل التنبيهات في حال تغيير حالات المشاريع، إسناد المهام إليك، بدء الاجتماعات أو إشعارٍ إداري.
        </p>
      </div>

      {/* Support Help Section (Full Width) */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/10 p-6 rounded-xl border border-blue-200 dark:border-blue-900/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg">
            <TicketIcon className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            الدعم الفني والشكاوى
          </h2>
        </div>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">
          واجهت مشكلة تقنية ضمن المنصة؟ افتح تذكرة عبر مبوبة (الدعم الفني) وصف المشكلة ليلقى فريق التطوير المعني الدعم الخاص بك والمساعدة بأسرع وقت.
        </p>
      </div>

      <div className="mt-12 text-center text-slate-500 text-sm">
        <p>قمنا بتصميم هذه المنصة لجعل التعامل اليومي وإدارة العمل أكثر سهولة في الشركة.</p>
        <p>أتمنى لك رحلة موفقة، ويسعدنا كونك جزءاً من الفريق!</p>
      </div>
    </div>
  );
};

