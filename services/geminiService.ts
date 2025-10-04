import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";

// Per guidelines, assume API_KEY is pre-configured and accessible.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generatePerformanceNotes = async (
  memberName: string,
  tasks: { title: string; status: string }[],
  logs: { hours: number; description: string }[]
): Promise<string> => {
  const prompt = `
    Please generate a performance review summary in Arabic for the team member: ${memberName}.
    
    Here is their recent activity:
    Tasks:
    ${tasks.map(t => `- ${t.title} (Status: ${t.status})`).join('\n')}
    
    Work Logs:
    ${logs.map(l => `- Logged ${l.hours} hours for: ${l.description}`).join('\n')}
    
    Based on this data, provide a concise and constructive performance summary. Please structure your response with the following sections:
    - "النقاط الإيجابية والإنجازات:" (Positive Points & Achievements)
    - "نقاط للتحسين والتطوير:" (Areas for Improvement & Development)

    The tone should be professional and encouraging.
  `;
  
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an HR assistant writing performance reviews in Arabic.",
        temperature: 0.5,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Error generating performance notes:", error);
    return "حدث خطأ أثناء إنشاء ملاحظات الأداء.";
  }
};


export const generateTaskPlan = async (projectDescription: string) => {
  const prompt = `
    Based on the following project description, generate a list of tasks needed to complete it.
    For each task, provide a clear title and suggest a suitable role ('employee', 'manager', 'freelancer', 'any').
    Project Description: "${projectDescription}"
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert project manager. Your goal is to break down a project description into a clear, actionable list of tasks in JSON format.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tasks: {
              type: Type.ARRAY,
              description: "A list of tasks to complete the project.",
              items: {
                type: Type.OBJECT,
                properties: {
                  title: {
                    type: Type.STRING,
                    description: "The title of the task."
                  },
                  suggestedRole: {
                    type: Type.STRING,
                    description: "The suggested role to perform this task.",
                    enum: ['employee', 'manager', 'freelancer', 'any'],
                  }
                },
                required: ["title", "suggestedRole"]
              }
            }
          },
          required: ["tasks"]
        }
      }
    });

    // FIX: Trim whitespace from the response before parsing as JSON.
    // The response text can sometimes contain leading/trailing whitespace which breaks JSON.parse.
    const jsonResponse = JSON.parse(response.text.trim());
    return jsonResponse.tasks || [];

  } catch (error) {
    console.error("Error generating task plan:", error);
    throw new Error("حدث خطأ أثناء إنشاء خطة المهام المقترحة.");
  }
};