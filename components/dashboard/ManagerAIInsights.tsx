import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { SparklesIcon } from '../ui/Icons';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import ReactMarkdown from 'react-markdown';
import { useSettingsContext } from '@shared/contexts/SettingsContext';

interface ManagerAIInsightsProps {
    projects: any[];
    teamMembers: any[];
    tasks: any[];
}

export const ManagerAIInsights: React.FC<ManagerAIInsightsProps> = ({ projects, teamMembers, tasks }) => {
    const [insights, setInsights] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { siteSettings } = useSettingsContext();

    const generateInsights = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/ai-insights', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    projects,
                    teamMembers,
                    tasks,
                    apiKey: siteSettings?.geminiApiKey
                }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to generate insights');
            }

            const data = await response.json();
            setInsights(data.insights);
        } catch (err: any) {
            console.error(err);
            setError(err?.message || 'حدث خطأ أثناء توليد التحليلات. يرجى المحاولة مرة أخرى.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card 
            title="مستشار الإدارة الذكي (AI)" 
            icon={<SparklesIcon className="w-5 h-5 text-amber-500" />}
            headerActions={
                <button 
                    onClick={generateInsights} 
                    disabled={loading}
                    className="flex items-center space-x-1 rtl:space-x-reverse px-3 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-md disabled:opacity-50 transition-colors"
                >
                    <SparklesIcon className="w-4 h-4" />
                    <span>{insights ? 'تحديث التحليل' : 'تحليل بيانات الفريق'}</span>
                </button>
            }
        >
            <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center min-h-[250px]">
                {loading && (
                    <div className="flex flex-col items-center text-slate-500 dark:text-slate-400 space-y-4">
                        <LoadingSpinner className="w-8 h-8 text-amber-500" />
                        <p>يتم الآن تحليل أداء الفريق والمشاريع...</p>
                    </div>
                )}
                
                {!loading && error && (
                    <div className="text-red-500 text-center">
                        <p>{error}</p>
                    </div>
                )}

                {!loading && !error && !insights && (
                    <div className="text-center text-slate-500 dark:text-slate-400 space-y-3">
                        <SparklesIcon className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
                        <p>انقر على "تحليل بيانات الفريق" للحصول على تقييم شامل لأداء فريقك وحالة المشاريع باستخدام الذكاء الاصطناعي المجاني (Gemini).</p>
                    </div>
                )}

                {!loading && !error && insights && (
                    <div className="w-full h-full text-slate-800 dark:text-slate-200 text-sm leading-relaxed text-right markdown-body prose dark:prose-invert">
                         <ReactMarkdown>{insights}</ReactMarkdown>
                    </div>
                )}
            </div>
        </Card>
    );
};
