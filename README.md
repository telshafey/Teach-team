# تيك تيم (TeemTime)

تطبيق ويب متكامل مصمم لمساعدة الفرق على تنظيم وتتبع عملهم بكفاءة. يوفر التطبيق أدوات لتخطيط ساعات عمل الفريق، تسجيل المهام اليومية وربطها بالمشاريع، وإدارة الجوانب المالية، مع تقديم ملخصات ذكية مدعومة بالذكاء الاصطناعي.

## ✨ الميزات الرئيسية

- **لوحات تحكم مخصصة**: واجهات مختلفة لكل دور (مدير عام، مدير مشروع، موظف) لعرض البيانات الأكثر أهمية.
- **إدارة المشاريع**:
    - عرض المشاريع على شكل بطاقات مع تتبع التقدم.
    - لوحة مهام (Kanban Board) لتنظيم المهام (لم تبدأ، قيد التنفيذ، مكتملة).
    - إضافة مهام وتعليقات ومرفقات.
- **إدارة الفريق**:
    - عرض هيكل الفريق بشكل شجري.
    - صفحات تفصيلية لكل عضو فريق مع تحليلات لأدائه.
    - إدارة الأدوار والصلاحيات للتحكم في الوصول.
- **تسجيل الدوام والإنتاجية**:
    - تقويم تفاعلي لعرض الساعات المسجلة.
    - إضافة وتعديل السجلات اليومية بسهولة.
- **إدارة مالية**:
    - تقديم ومراجعة طلبات صرف المصروفات.
    - تتبع تكاليف المشاريع بناءً على ساعات عمل الفريق.
    - إدارة الرواتب وأجور المستقلين.
- **تقارير وتحليلات**:
    - رسوم بيانية تفاعلية لتحليل توزيع ساعات العمل وحالة المهام.
    - تقارير حول ميزانيات المشاريع.
- **ميزات الذكاء الاصطناعي (AI)**:
    - **مساعد تخطيط ذكي**: يقوم بتحليل وصف المشروع واقتراح قائمة مهام أولية.
    - **ملخصات الأداء**: يقوم بإنشاء ملخصات لأداء الموظفين بناءً على مهامهم وسجلاتهم.
- **اجتماعات الفيديو**:
    - جدولة اجتماعات الفريق.
    - الانضمام إلى غرف اجتماعات فيديو مباشرة داخل التطبيق (مدعوم بـ Jitsi).
- **نظام إشعارات**: تنبيهات فورية للمهام الجديدة، التعليقات، والطلبات التي تحتاج لمراجعة.
- **واجهة قابلة للتخصيص**: دعم الوضع الليلي (Dark Mode) والنهاري (Light Mode).

## 🚀 التقنيات المستخدمة

- **الواجهة الأمامية**: React, TypeScript
- **التصميم**: Tailwind CSS
- **الذكاء الاصطناعي**: Google Gemini API (`@google/genai`)
- **اجتماعات الفيديو**: Jitsi Meet External API
- **مكتبات مساعدة**:
    - `date-fns` لمعالجة التواريخ.
    - `csv-stringify` لتصدير البيانات.

## 🏁 كيفية التشغيل

هذا التطبيق مصمم للعمل مباشرة في المتصفح دون الحاجة إلى خطوات بناء معقدة.

1.  **افتح ملف `index.html`**: يمكنك فتح هذا الملف مباشرة في أي متصفح ويب حديث.
2.  **مفتاح API**:
    - ميزات الذكاء الاصطناعي (مثل إنشاء خطط المهام وملاحظات الأداء) تتطلب مفتاح API صالح من Google Gemini.
    - يفترض التطبيق أن المفتاح متوفر كمتغير بيئة (`process.env.API_KEY`) في بيئة التشغيل.

## 📦 النشر (Deployment)

التطبيق الآن جاهز للنشر! بما أنه تطبيق واجهة أمامية (client-side) خالص، يمكن نشره بسهولة على أي خدمة استضافة ثابتة (static hosting).

1.  **الملفات الأساسية**: كل ما تحتاجه هو `index.html` والملفات المرفقة (`index.tsx`, `metadata.json`, ...).
2.  **الاستضافة**: قم برفع جميع ملفات المشروع إلى خدمة مثل:
    *   Firebase Hosting
    *   Netlify
    *   Vercel
    *   GitHub Pages
3.  **متغيرات البيئة**: تأكد من تكوين متغير البيئة `API_KEY` في خدمة الاستضافة التي اخترتها. هذا المتغير ضروري لتشغيل ميزات الذكاء الاصطناعي.

التطبيق لا يتطلب خادمًا (server) أو عملية بناء (build process) معقدة، مما يجعل عملية النشر سريعة ومباشرة.

## 🧪 الاختبارات (Testing)

لضمان جودة التطبيق واستقراره، يُنصح بشدة بإضافة مجموعة من الاختبارات الآلية. هذا يساعد على اكتشاف الأخطاء مبكراً ويمنح الثقة عند إضافة ميزات جديدة أو تعديل الكود الحالي.

### 1. اختبارات الوحدات (Unit Tests)

تُستخدم لاختبار المكونات الفردية بشكل معزول للتأكد من أنها تعمل كما هو متوقع.

**الأدوات المقترحة**: [Jest](https://jestjs.io/) و [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/).

**مثال: اختبار المكون `PerformanceSummaryCard.tsx`**

```tsx
// components/dashboard/PerformanceSummaryCard.test.tsx

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PerformanceSummaryCard } from './PerformanceSummaryCard';

describe('PerformanceSummaryCard', () => {
  it('should render stats and calculate percentage change correctly', () => {
    const props = {
      currentMonthHours: 150,
      lastMonthHours: 120, // +25% change
      currentMonthTasks: 40,
      lastMonthTasks: 50,   // -20% change
    };

    render(<PerformanceSummaryCard {...props} />);

    // Check if current values are displayed
    expect(screen.getByText(/150.0 ساعة/i)).toBeInTheDocument();
    expect(screen.getByText(/40 مهمة/i)).toBeInTheDocument();

    // Check for positive percentage change
    const positiveChange = screen.getByText(/25%/i);
    expect(positiveChange).toBeInTheDocument();
    expect(positiveChange.closest('div')).toHaveClass('text-green-600');

    // Check for negative percentage change
    const negativeChange = screen.getByText(/20%/i);
    expect(negativeChange).toBeInTheDocument();
    expect(negativeChange.closest('div')).toHaveClass('text-red-600');
  });
});
```

### 2. الاختبارات الشاملة (End-to-End Tests)

تُستخدم لمحاكاة سلوك المستخدم الحقيقي عبر التطبيق بأكمله، من البداية إلى النهاية.

**الأدوات المقترحة**: [Cypress](https://www.cypress.io/) أو [Playwright](https://playwright.dev/).

**مثال: اختبار عملية تسجيل الدخول باستخدام Cypress**

```javascript
// cypress/e2e/login_spec.cy.ts

describe('Login Flow', () => {
  it('should allow a manager to log in and see their dashboard', () => {
    // Visit the login page
    cy.visit('/');

    // Select a manager from the dropdown
    // Note: We are selecting by value, which is the user's ID. '2' is Fatima Al-Zahrani (manager).
    cy.get('#user-select').select('2');

    // Click the login button
    cy.get('button[type="submit"]').click();

    // Assert that we are on the manager dashboard
    cy.contains('h2', 'لوحة تحكم المدير').should('be.visible');
    cy.contains('p', 'مرحباً فاطمة الزهراني، إليك نظرة على فريقك.').should('be.visible');

    // Assert that the decision center card is visible
    cy.contains('h3', 'مركز اتخاذ القرار').should('be.visible');
  });
});
```

## 📂 هيكل المشروع

```
/
├── components/         # مكونات React UI، مقسمة حسب الميزات
│   ├── dashboard/      # مكونات لوحات التحكم الرئيسية
│   ├── modals/         # المكونات المنبثقة (Modals)
│   ├── project/        # مكونات خاصة بالمشاريع والمهام
│   ├── shared/         # مكونات مشتركة مثل صفحة تسجيل الدخول
│   ├── team/           # مكونات إدارة الفريق
│   └── ui/             # مكونات UI عامة (أزرار، بطاقات، أيقونات)
├── contexts/           # React Contexts لإدارة الحالة العامة للتطبيق
├── services/           # الخدمات مثل apiService و geminiService
├── types.ts            # تعريفات TypeScript العامة
├── index.html          # نقطة الدخول الرئيسية للتطبيق
└── index.tsx           # ملف React الرئيسي
```