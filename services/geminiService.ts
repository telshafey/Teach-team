import { GoogleGenAI, Type } from "@google/genai";
import { SuggestedTask } from '../types';

let ai: GoogleGenAI | null = null;

/**
 * Lazily initializes and returns the GoogleGenAI client.
 * This prevents the app from crashing on startup if the API key is not provided.
 */
const getAiClient = (): GoogleGenAI | null => {
  if (ai) {
    return ai;
  }
  if (process.env.API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return ai;
  }
  // Log a warning for developers in the console, but don't throw a fatal error here.
  console.warn("Gemini API Key is not configured. AI features will be disabled.");
  return null;
};


/**
 * Generates performance notes for a team member using the Gemini API.
 */
export const generatePerformanceNotes = async (
  memberName: string,
  tasks: { title: string; status: string }[],
  logs: { hours: number; description:string }[]
): Promise<string> => {
  const client = getAiClient();
  if (!client) {
    throw new Error('خدمة الذكاء الاصطناعي غير مهيأة. يرجى التواصل مع المسؤول.');
  }

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

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error('Error generating performance notes:', error);
    throw new Error('Failed to generate performance notes from AI service.');
  }
};

/**
 * Generates a suggested task plan for a project description using the Gemini API.
 */
export const generateTaskPlan = async (projectDescription: string): Promise<SuggestedTask[]> => {
  const client = getAiClient();
  if (!client) {
    throw new Error('خدمة الذكاء الاصطناعي غير مهيأة. يرجى التواصل مع المسؤول.');
  }
  
  const prompt = `
    Based on the following project description, generate a list of main tasks required to complete the project.
    For each task, suggest a suitable role ('employee', 'manager', 'freelancer', or 'any').
    Return the result as a JSON array of objects, where each object has "title" and "suggestedRole" properties.

    Project Description:
    "${projectDescription}"
  `;
  
  try {
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
            required: ['title', 'suggestedRole'],
          },
        },
      },
    });

    const jsonText = response.text.trim();
    // It's possible for the model to return an empty string or malformed JSON
    if (!jsonText) {
        return [];
    }
    const tasks = JSON.parse(jsonText);
    return tasks as SuggestedTask[];
  } catch (error) {
    console.error('Error generating task plan:', error);
    throw new Error('Failed to generate task plan from AI service.');
  }
};
