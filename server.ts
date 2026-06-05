import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/ai-insights", async (req, res) => {
    try {
      const { projects, teamMembers, tasks, apiKey: clientApiKey } = req.body;
      
      const apiKey = clientApiKey?.trim() || process.env.GEMINI_API_KEY?.trim();
      if (!apiKey) {
        return res.status(500).json({ error: "Gemini API Key is missing. Please configure it in settings." });
      }

      const ai = new GoogleGenAI({ apiKey });

      const prompt = `
أنت مستشار إداري خبير في إدارة الفرق والمشاريع. بناءً على البيانات التالية للفريق، قم بتقديم:
1. تحليل شامل لأداء الفريق (من يحمل عبء عمل كبير ومن لديه وقت متاح).
2. تقييم لحالة المشاريع الحالية (المخاطر والتأخيرات المحتملة).
3. توصيات محددة لتحسين الإنتاجية وإعادة توزيع المهام إذا لزم الأمر.

البيانات:
- عدد أعضاء الفريق: ${teamMembers?.length || 0}
- عدد المشاريع النشطة: ${projects?.length || 0}
- عدد المهام: ${tasks?.length || 0}

تفاصيل المبسطة:
المشاريع: ${JSON.stringify(projects?.map((p: any) => ({ name: p.name, status: p.status })))}
الأعضاء: ${JSON.stringify(teamMembers?.map((m: any) => ({ name: m.name, role: m.roleId })))}

تأكد من يكون الرد احترافي، موجه للإدارة العليا، باللغة العربية.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
      });

      res.json({ insights: response.text });
    } catch (error: any) {
      console.error("AI Insights Error:", error?.message || error);
      let errorMessage = "حدث خطأ غير معروف. يرجى المحاولة مرة أخرى.";
      if (error?.message?.includes("429") || error?.message?.includes("credits are depleted")) {
         errorMessage = "رصيد مفتاح الذكاء الاصطناعي الخاص بك قد نفد. يرجى الترقية أو استخدام مفتاح جديد.";
      }
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post("/api/ai-tasks", async (req, res) => {
    try {
      const { project, apiKey: clientApiKey } = req.body;
      const apiKey = clientApiKey?.trim() || process.env.GEMINI_API_KEY?.trim();
      
      console.log('AI Tasks Request - clientApiKey exists:', !!clientApiKey, 'length:', clientApiKey ? clientApiKey.length : 0);
      if (apiKey) {
         console.log('Using API Key starting with:', apiKey.substring(0, 5));
      }

      console.log('API Key present:', !!apiKey, 'Length:', apiKey ? apiKey.length : 0);
      if (!apiKey) {
        return res.status(500).json({ error: "Gemini API Key is missing. Please configure it in settings." });
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
أنت مدير مشاريع محترف.
المشروع هو: ${project?.name}
وصف المشروع: ${project?.description || 'غير محدد'}

قم باقتراح من 3 إلى 5 مهام أساسية لبدء هذا المشروع، بحيث تغطي التنفيذ الأولي.
أعد النتيجة بصيغة JSON فقط كالتالي (بدون أي نصوص إضافية):
[
  {
    "title": "اسم المهمة",
    "description": "وصف المهمة"
  }
]
`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
      });

      let text = response.text || '';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
          text = jsonMatch[0];
      }

      const tasks = JSON.parse(text);
      res.json({ tasks });
    } catch (error: any) {
      console.error("AI Tasks Error:", error?.message || error);
      let errorMessage = "حدث خطأ غير معروف. يرجى المحاولة مرة أخرى.";
      if (error?.message?.includes("429") || error?.message?.includes("credits are depleted") || error?.message?.includes("RESOURCE_EXHAUSTED")) {
         errorMessage = "رصيد مفتاح الذكاء الاصطناعي الخاص بك قد نفد. يرجى الترقية و شحن حسابك، أو استخدام مفتاح جديد.";
      } else if (error?.message) {
         errorMessage = error.message;
      }
      res.status(500).json({ error: errorMessage });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
