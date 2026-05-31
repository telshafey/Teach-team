import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSupabase } from '@shared/contexts/SupabaseContext';
import * as api from '@shared/services/apiService';
import { GlobalSearchResults } from '@shared/types';
import { SearchIcon, FolderIcon, UserIcon, ClipboardDocumentListIcon, PlusIcon, VideoCameraIcon, UserCircleIcon, Cog8ToothIcon } from '../ui/Icons';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { View } from '@shared/navigation.types';
import { useNavigation } from '@shared/contexts/NavigationContext';
import { useTeamContext } from '@shared/contexts/TeamContext';
import { useSettingsContext } from '@shared/contexts/SettingsContext';

interface Command {
    id: string;
    label: string;
    icon: React.ReactNode;
    action: () => void;
    permission: boolean;
}

export const GlobalSearch: React.FC = () => {
    const { onNavigate } = useNavigation();
    const { supabaseClient } = useSupabase();
    const { hasPermission } = useTeamContext();
    const { siteSettings } = useSettingsContext();
    
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<GlobalSearchResults | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    const searchContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsContainerRef = useRef<HTMLDivElement>(null);
    
    const allCommands: Omit<Command, 'permission'>[] = [
        { id: 'add-project', label: 'إضافة مشروع جديد', icon: <PlusIcon className="w-5 h-5" />, action: () => onNavigate('projects', { isModalOpen: true }) },
        { id: 'add-log', label: 'إضافة سجل عمل', icon: <PlusIcon className="w-5 h-5" />, action: () => onNavigate('timesheet', { openLogModal: true }) },
        { id: 'schedule-meeting', label: 'جدولة اجتماع جديد', icon: <VideoCameraIcon className="w-5 h-5" />, action: () => onNavigate('meetings', { openMeetingModal: true }) },
        { id: 'go-to-profile', label: 'ملفي الشخصي', icon: <UserCircleIcon className="w-5 h-5" />, action: () => onNavigate('profile') },
        { id: 'go-to-settings', label: 'الإعدادات', icon: <Cog8ToothIcon className="w-5 h-5" />, action: () => onNavigate('settings') },
    ];

    const availableCommands = useMemo(() => allCommands.map(cmd => {
        let permission = false;
        if (cmd.id === 'add-project') permission = hasPermission('manage_projects');
        else if (cmd.id === 'schedule-meeting') permission = !!siteSettings?.isMeetingsModuleEnabled;
        else if (cmd.id === 'go-to-settings') permission = hasPermission('manage_site_settings') || hasPermission('manage_roles') || hasPermission('manage_db_settings');
        else permission = true;
        return { ...cmd, permission };
    }).filter(cmd => cmd.permission), [allCommands, hasPermission, siteSettings]);

    const filteredCommands = useMemo(() => {
        if (!searchTerm) return availableCommands;
        return availableCommands.filter(cmd => cmd.label.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [searchTerm, availableCommands]);

    const combinedResults = useMemo(() => [
        ...filteredCommands,
        ...(results?.projects || []),
        ...(results?.tasks || []),
        ...(results?.teamMembers || []),
    ], [filteredCommands, results]);


    const openSearch = () => {
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const closeSearch = useCallback(() => {
        setIsOpen(false);
        setSearchTerm('');
        setResults(null);
        setActiveIndex(0);
    }, []);

    useEffect(() => {
        if (activeIndex >= 0 && resultsContainerRef.current) {
            const activeElement = resultsContainerRef.current.children[activeIndex] as HTMLElement;
            activeElement?.scrollIntoView({ block: 'nearest' });
        }
    }, [activeIndex]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closeSearch();
            }
            if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
                event.preventDefault();
                openSearch();
            }
            if (isOpen) {
                if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    setActiveIndex(prev => (prev + 1) % combinedResults.length);
                } else if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    setActiveIndex(prev => (prev - 1 + combinedResults.length) % combinedResults.length);
                } else if (event.key === 'Enter' && activeIndex >= 0) {
                    event.preventDefault();
                    const selected = combinedResults[activeIndex];
                    if (selected) {
                        handleSelect(selected);
                    }
                }
            }
        };

        const handleClickOutside = (event: MouseEvent) => {
            if (isOpen && searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                closeSearch();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, closeSearch, combinedResults, activeIndex]);

    const performSearch = useCallback(async (term: string) => {
        if (!supabaseClient) return;
        setIsLoading(true);
        try {
            const searchResults = await api.performGlobalSearch(supabaseClient, term);
            setResults(searchResults);
        } catch (error) {
            console.error("Global search failed:", error);
        } finally {
            setIsLoading(false);
        }
    }, [supabaseClient]);

    useEffect(() => {
        setActiveIndex(0);
        if (searchTerm.trim().length === 0) {
          setResults(null);
          setIsLoading(false);
          return;
        }

        if (searchTerm.trim().length > 1) {
            setIsLoading(true);
            const debounceTimer = setTimeout(() => {
                performSearch(searchTerm);
            }, 300);
            return () => clearTimeout(debounceTimer);
        }
    }, [searchTerm, performSearch]);

    const handleSelect = (item: any) => {
        if (item.action) { // It's a command
            item.action();
        } else if (item.projectId) { // It's a task
            onNavigate('projectDetail', { projectId: item.projectId, initialTaskIdToOpen: item.id });
        } else if (item.description !== undefined) { // It's a project
             onNavigate('projectDetail', { projectId: item.id });
        } else { // It's a team member
            onNavigate('teamDetail', { memberId: item.id });
        }
        closeSearch();
    };

    const hasResults = results && (results.projects.length > 0 || results.tasks.length > 0 || results.teamMembers.length > 0);

    return (
        <>
            <button onClick={openSearch} className="flex items-center space-x-2 rtl:space-x-reverse p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="ابحث في التطبيق">
                <SearchIcon className="w-6 h-6" />
                <span className="hidden md:inline text-sm">بحث...</span>
                <kbd className="hidden md:inline text-xs font-sans font-semibold text-slate-400 border border-slate-300 dark:border-slate-600 rounded px-1.5 py-0.5">Ctrl+K</kbd>
            </button>

            {isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center pt-20">
                    <div ref={searchContainerRef} className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg max-h-[70vh] flex flex-col">
                        <div className="relative p-4 border-b border-slate-200 dark:border-slate-700">
                            <div className="absolute inset-y-0 right-0 flex items-center pr-6 pointer-events-none">{isLoading ? <LoadingSpinner className="text-sky-500"/> : <SearchIcon className="w-5 h-5 text-slate-400" />}</div>
                            <input ref={inputRef} type="text" placeholder="ابحث أو اكتب أمراً..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-2 pr-10 border-0 ring-0 focus:ring-0 text-md bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400"/>
                        </div>
                        <div ref={resultsContainerRef} className="flex-1 overflow-y-auto">
                           {(filteredCommands.length > 0 || hasResults) ? (
                                <div className="p-2 space-y-2">
                                    {filteredCommands.length > 0 && (
                                        <div>
                                            <h3 className="text-xs font-semibold uppercase text-slate-400 mb-1 px-2">الإجراءات</h3>
                                            {filteredCommands.map((cmd, index) => (
                                                <div key={cmd.id} onClick={() => handleSelect(cmd)} onMouseMove={() => setActiveIndex(index)} className={`flex items-center space-x-3 rtl:space-x-reverse p-2 rounded-md cursor-pointer ${activeIndex === index ? 'bg-slate-100 dark:bg-slate-700' : ''}`}>
                                                    {cmd.icon} <span className="text-sm text-slate-700 dark:text-slate-200">{cmd.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {hasResults && (
                                        <div>
                                            <h3 className="text-xs font-semibold uppercase text-slate-400 mb-1 px-2">نتائج البحث</h3>
                                            {results.projects.map((p, index) => {
                                                const overallIndex = filteredCommands.length + index;
                                                return <div key={`proj-${p.id}`} onClick={() => handleSelect(p)} onMouseMove={() => setActiveIndex(overallIndex)} className={`flex items-center space-x-3 rtl:space-x-reverse p-2 rounded-md cursor-pointer ${activeIndex === overallIndex ? 'bg-slate-100 dark:bg-slate-700' : ''}`}>
                                                    <FolderIcon className="w-5 h-5 text-sky-500"/> <span className="text-sm text-slate-700 dark:text-slate-200">{p.name}</span>
                                                </div>
                                            })}
                                            {results.tasks.map((t, index) => {
                                                const overallIndex = filteredCommands.length + results.projects.length + index;
                                                return <div key={`task-${t.id}`} onClick={() => handleSelect(t)} onMouseMove={() => setActiveIndex(overallIndex)} className={`flex items-center space-x-3 rtl:space-x-reverse p-2 rounded-md cursor-pointer ${activeIndex === overallIndex ? 'bg-slate-100 dark:bg-slate-700' : ''}`}>
                                                    <ClipboardDocumentListIcon className="w-5 h-5 text-green-500"/> <span className="text-sm text-slate-700 dark:text-slate-200">{t.title}</span>
                                                </div>
                                            })}
                                            {results.teamMembers.map((m, index) => {
                                                const overallIndex = filteredCommands.length + results.projects.length + results.tasks.length + index;
                                                return <div key={`member-${m.id}`} onClick={() => handleSelect(m)} onMouseMove={() => setActiveIndex(overallIndex)} className={`flex items-center space-x-3 rtl:space-x-reverse p-2 rounded-md cursor-pointer ${activeIndex === overallIndex ? 'bg-slate-100 dark:bg-slate-700' : ''}`}>
                                                    <UserIcon className="w-5 h-5 text-indigo-500"/> <span className="text-sm text-slate-700 dark:text-slate-200">{m.name}</span>
                                                </div>
                                            })}
                                        </div>
                                    )}
                                </div>
                           ) : searchTerm && !isLoading ? (
                                <p className="text-center text-slate-500 p-8">لم يتم العثور على نتائج.</p>
                           ) : !isLoading && (
                                <p className="text-center text-slate-500 p-8">اكتب للبحث أو اختر إجراءً سريعًا.</p>
                           )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};