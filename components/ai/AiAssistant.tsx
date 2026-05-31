import React, { useState, FormEvent, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import type { Chat } from "@google/genai";
import { SparklesIcon, PaperAirplaneIcon, XMarkIcon } from '../ui/Icons';
import { useToast } from '@shared/contexts/ToastContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useAuth } from '@shared/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@shared/contexts/SupabaseContext';
import * as api from '@shared/services/apiService';
import { Project, Task, Meeting } from '@shared/types';
import { format, isToday, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface Message {
    role: 'user' | 'model';
    text: string;
}

export const AiAssistant: React.FC = () => {
    const { currentUser } = useAuth();
    const { supabaseClient } = useSupabase();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [chat, setChat] = useState<Chat | null>(null);
    const { addToast } = useToast();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        // Set initial message once currentUser is available
        if (currentUser && messages.length === 0) {
            setMessages([
                { role: 'model', text: `أهلاً بك يا ${currentUser.name}! أنا مساعدك الذكي. يمكنك أن تسألني عن مهامك، مشاريعك، أو اجتماعاتك اليوم.` }
            ]);
        }
    }, [currentUser, messages.length]);


    // Fetch user-specific data to provide context to the AI
    const { data: tasks = [] } = useQuery<Task[]>({
        queryKey: ['tasks'],
        queryFn: () => api.getAll(supabaseClient!, 'tasks'),
        enabled: !!supabaseClient && isOpen,
    });
    const { data: projects = [] } = useQuery<Project[]>({
        queryKey: ['projects'],
        queryFn: () => api.getAll(supabaseClient!, 'projects'),
        enabled: !!supabaseClient && isOpen,
    });
    const { data: meetings = [] } = useQuery<Meeting[]>({
        queryKey: ['meetings'],
        queryFn: () => api.getAll(supabaseClient!, 'meetings'),
        enabled: !!supabaseClient && isOpen,
    });
    
    const myOpenTasks = useMemo(() => tasks.filter(t => t.assignedTo === currentUser?.id && t.status !== 'done'), [tasks, currentUser]);
    const myProjects = useMemo(() => projects.filter(p => p.members?.some(m => m.teamMemberId === currentUser?.id)), [projects, currentUser]);
    const myTodaysMeetings = useMemo(() => meetings.filter(m => m.members?.includes(currentUser?.id || -1) && m.startTime && isToday(parseISO(m.startTime))), [meetings, currentUser]);


    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const initializeChat = () => {
        if (chat) return chat;
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const newChat = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: {
                    systemInstruction: `You are a helpful assistant for a team management application called "Bokra Team". 
                    Your primary language for responses is Arabic.
                    You will be provided with context about the user's current data (tasks, projects, meetings). 
                    Use this context to answer questions accurately. 
                    If the user asks something not in the context, politely say you don't have access to that information.
                    Be concise and friendly.`,
                },
            });
            setChat(newChat);
            return newChat;
        } catch (error) {
            console.error("AI Initialization failed:", error);
            addToast("فشل تهيئة المساعد الذكي. قد تكون إعدادات API غير صحيحة.", "error");
            setIsOpen(false);
            return null;
        }
    };
    
    const handleToggleOpen = () => {
        if (!isOpen) {
            initializeChat(); // Pre-initialize when opening
        }
        setIsOpen(!isOpen);
    };

    const handleSendMessage = async (e: FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || isLoading) return;

        const currentChat = chat || initializeChat();
        if (!currentChat) return;

        const userMessage: Message = { role: 'user', text: userInput };
        setMessages(prev => [...prev, userMessage]);
        const question = userInput;
        setUserInput('');
        setIsLoading(true);

        // --- Build Context ---
        let contextString = `--- CONTEXT START ---\n`;
        contextString += `User Name: ${currentUser?.name}\n`;
        contextString += `Date: ${new Date().toLocaleDateString('ar-EG')}\n`;
        
        if(myOpenTasks.length > 0) {
            contextString += `\nOpen Tasks (${myOpenTasks.length}):\n`;
            myOpenTasks.forEach(t => {
                const projectName = projects.find(p => p.id === t.projectId)?.name || 'General';
                contextString += `- ${t.title} (Project: ${projectName}, Due: ${t.dueDate || 'N/A'})\n`;
            });
        }

        if(myProjects.length > 0) {
            contextString += `\nActive Projects (${myProjects.length}):\n`;
            myProjects.forEach(p => {
                contextString += `- ${p.name} (Status: ${p.status})\n`;
            });
        }
        
         if(myTodaysMeetings.length > 0) {
            contextString += `\nToday's Meetings (${myTodaysMeetings.length}):\n`;
            myTodaysMeetings.forEach(m => {
                contextString += `- ${m.title} at ${m.startTime ? format(parseISO(m.startTime), 'p', { locale: arSA }) : 'N/A'}\n`;
            });
        }

        contextString += `--- CONTEXT END ---\n\n`;
        const finalPrompt = `${contextString}User Question: ${question}`;
        
        try {
            const response = await currentChat.sendMessage({ message: finalPrompt });
            const modelMessage: Message = { role: 'model', text: response.text };
            setMessages(prev => [...prev, modelMessage]);
        } catch (error) {
            console.error("Error sending message to Gemini:", error);
            addToast("حدث خطأ أثناء التواصل مع المساعد الذكي.", "error");
            setMessages(prev => [...prev, {role: 'model', text: 'عذراً، حدث خطأ ما. يرجى المحاولة مرة أخرى.'}]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={handleToggleOpen}
                className="fixed bottom-20 right-6 lg:bottom-6 z-40 w-16 h-16 bg-sky-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-sky-700 transition-transform transform hover:scale-110"
                aria-label="افتح المساعد الذكي"
            >
                <SparklesIcon className="w-8 h-8" />
            </button>

            {isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex justify-center items-center">
                    <div className="fixed bottom-6 right-6 w-[calc(100%-3rem)] md:w-96 h-[70vh] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl flex flex-col" dir="rtl">
                        <header className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                            <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                <SparklesIcon className="w-6 h-6 text-sky-500" />
                                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">المساعد الذكي</h3>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                                <XMarkIcon className="w-6 h-6 text-slate-500" />
                            </button>
                        </header>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map((msg, index) => (
                                <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    {msg.role === 'model' && <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center flex-shrink-0"><SparklesIcon className="w-5 h-5 text-white" /></div>}
                                    <div className={`p-3 rounded-2xl max-w-xs text-sm ${msg.role === 'user' ? 'bg-sky-600 text-white rounded-br-none' : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none'}`}>
                                        <div className="whitespace-pre-wrap">{msg.text}</div>
                                    </div>
                                </div>
                            ))}
                             {isLoading && (
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center flex-shrink-0"><SparklesIcon className="w-5 h-5 text-white" /></div>
                                    <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center space-x-2">
                                       <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-0"></span>
                                       <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-200"></span>
                                       <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-400"></span>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <footer className="p-4 border-t border-slate-200 dark:border-slate-700">
                            <form onSubmit={handleSendMessage} className="flex items-center space-x-2 rtl:space-x-reverse">
                                <input
                                    type="text"
                                    value={userInput}
                                    onChange={(e) => setUserInput(e.target.value)}
                                    placeholder="اسأل أي شيء..."
                                    className="flex-1 p-2 border border-slate-300 dark:border-slate-600 rounded-full bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                                    disabled={isLoading}
                                />
                                <button type="submit" disabled={isLoading || !userInput.trim()} className="w-10 h-10 bg-sky-600 text-white rounded-full flex items-center justify-center flex-shrink-0 disabled:bg-slate-400">
                                    {isLoading ? <LoadingSpinner className="w-5 h-5" /> : <PaperAirplaneIcon className="w-5 h-5" />}
                                </button>
                            </form>
                        </footer>
                    </div>
                </div>
            )}
        </>
    );
};