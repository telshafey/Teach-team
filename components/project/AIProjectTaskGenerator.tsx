import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Project } from '@shared/types';
import { SparklesIcon } from '../ui/Icons';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useSettingsContext } from '@shared/contexts/SettingsContext';

interface AIProjectTaskGeneratorProps {
    project: Project;
    onGenerate: (tasks: any[]) => void;
    onCancel: () => void;
}

export const AIProjectTaskGenerator: React.FC<AIProjectTaskGeneratorProps> = ({ project, onGenerate, onCancel }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedTasks, setGeneratedTasks] = useState<any[]>([]);
    const { siteSettings } = useSettingsContext();
    
    const generateTasks = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/ai-tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project, apiKey: siteSettings?.geminiApiKey }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to generate tasks');
            }

            const data = await response.json();
            setGeneratedTasks(data.tasks || []);
        } catch (err: any) {
            console.error(err);
            setError(err?.message || 'حدث خطأ أثناء توليد المهام. يرجى المحاولة مرة أخرى أو التأكد من مفتاح Gemini.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card title={`توليد مهام لمشروع: ${project.name}`} icon={<SparklesIcon className="w-5 h-5 text-amber-500" />}>
            <div className="p-4 flex flex-col space-y-6">
                {!generatedTasks.length && !loading && (
                    <div className="text-center text-slate-500 py-8">
                        <SparklesIcon className="w-16 h-16 mx-auto mb-4 text-amber-500 opacity-50" />
                        <p className="mb-6">يمكن للذكاء الاصطناعي اقتراح مجموعة مهام مبدئية بناءً على مسمى المشروع ووصفه. هذا سيوفر عليك وقت التخطيط.</p>
                        <button 
                            onClick={generateTasks} 
                            className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-lg font-medium transition flex items-center justify-center mx-auto space-x-2 rtl:space-x-reverse"
                        >
                            <SparklesIcon className="w-5 h-5" />
                            <span>توليد المهام المقترحة</span>
                        </button>
                    </div>
                )}

                {loading && (
                    <div className="flex flex-col items-center justify-center py-12">
                        <LoadingSpinner className="w-10 h-10 text-amber-500 mb-4" />
                        <p className="text-slate-500">جاري تحليل المشروع وتوليد المهام...</p>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-md text-center">
                        {error}
                    </div>
                )}

                {generatedTasks.length > 0 && !loading && (
                    <div>
                        <h3 className="font-semibold text-slate-800 mb-4 dark:text-slate-200">المهام المقترحة:</h3>
                        <div className="space-y-3 mb-6">
                            {generatedTasks.map((task, idx) => (
                                <div key={idx} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-md border border-slate-200 dark:border-slate-700">
                                    <h4 className="font-medium text-sky-700 dark:text-sky-400 mb-1">{task.title}</h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">{task.description}</p>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end space-x-3 rtl:space-x-reverse">
                            <button onClick={onCancel} className="px-4 py-2 border rounded-md text-slate-600 hover:bg-slate-50">إلغاء</button>
                            <button onClick={() => onGenerate(generatedTasks)} className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700">
                                اعتماد هذه المهام واضافتها
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
};
