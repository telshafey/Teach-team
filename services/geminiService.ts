import { GoogleGenAI, Type } from "@google/genai";
import { SuggestedTask, Project, Task, DailyLog, TeamMember } from '../types';

let ai: GoogleGenAI | null = null;

/**
 * Lazily initializes and returns the GoogleGenAI client.
 * For a production environment, this assumes `process.env.API_KEY` is set.
 */
const getAiClient = (): GoogleGenAI => {
  if (ai) {
    return ai;
  }
  // The constructor will throw an error if the API key is not provided,
  // which is a fatal configuration error in a production environment.
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return ai;
};


/**
 * Generates performance notes for a team member using the Gemini API.
 */
export const generatePerformanceNotes = async (
  memberName: string,
  tasks: { title: string; status: string }[],
  logs: { hours: number; description:string }[]
): Promise<string> => {
  try {
    const client = getAiClient();
    const taskSummary = tasks.map(t => `- ${t.title} (Status: ${t.status})`).join('\n');
    const logSummary = logs.map(l => `- Logged ${l.hours.toFixed(1)} hours for: ${l.description}`).join('\n');

    const prompt = `
      Based on the following data for team member "${memberName}", generate a concise performance review summary in Arabic.
      Focus on achievements, areas of high productivity, and potential areas for improvement. Keep it professional and constructive.

      Tasks Summary:
      ${taskSummary}

      Recent Activity Logs:
      ${logSummary}

      Performance Summary (in Arabic):
    `;
    
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error('Error generating performance notes:', error);
    throw new Error('فشل إنشاء ملخص الأداء. قد تكون خدمة الذكاء الاصطناعي غير مهيأة بشكل صحيح.');
  }
};

/**
 * Generates a suggested task plan for a project description using the Gemini API.
 */
export const generateTaskPlan = async (projectDescription: string): Promise<SuggestedTask[]> => {
  try {
    const client = getAiClient();
    const prompt = `
      Based on the following project description, generate a list of main tasks required to complete the project.
      For each task, suggest a suitable role ('employee', 'manager', 'freelancer', or 'any').
      Return the result as a JSON array of objects, where each object has "title" and "suggestedRole" properties.

      Project Description:
      "${projectDescription}"
    `;
    
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: 'The title of the task.',
              },
              suggestedRole: {
                type: Type.STRING,
                description: "The suggested role for the task ('employee', 'manager', 'freelancer', 'any').",
              },
            },
            propertyOrdering: ['title', 'suggestedRole'],
          },
        },
      },
    });

    const jsonText = response.text.trim();
    if (!jsonText) {
        return [];
    }
    const tasks = JSON.parse(jsonText);
    return tasks as SuggestedTask[];
  } catch (error) {
    console.error('Error generating task plan:', error);
    throw new Error('فشل إنشاء خطة المهام. قد تكون خدمة الذكاء الاصطناعي غير مهيأة بشكل صحيح.');
  }
};

/**
 * Generates a smart summary for a project's health using the Gemini API.
 */
export const generateProjectSummary = async (
  project: Project,
  tasks: Task[],
  logs: DailyLog[],
  teamMembers: TeamMember[]
): Promise<string> => {
  try {
    const client = getAiClient();
    
    const taskSummary = tasks.map(t => {
        const assignee = teamMembers.find(m => m.id === t.assignedTo);
        return `- ${t.title} (Status: ${t.status}, Assigned to: ${assignee?.name || 'Unassigned'})`;
    }).join('\n');
    
    const logSummary = logs.slice(-10).map(l => `- Logged ${l.hours.toFixed(1)}h for: ${l.description}`).join('\n');

    const prompt = `
      Please act as an expert project manager. Based on the following data for the project "${project.name}", generate a concise project health summary in Arabic.
      The summary should be analytical, highlighting progress, potential risks or bottlenecks, and overall status. Be professional and constructive.

      Project Description: ${project.description}

      Tasks Summary (${tasks.length} total tasks):
      ${taskSummary}

      Recent Activity Logs (last 10):
      ${logSummary}

      Project Health Summary (in Arabic):
    `;
    
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error('Error generating project summary:', error);
    throw new Error('فشل إنشاء ملخص المشروع. قد تكون خدمة الذكاء الاصطناعي غير مهيأة بشكل صحيح.');
  }
};
