import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import * as api from '../../services/apiService';
import { GlobalSearchResults } from '../../types';
import { SearchIcon, FolderIcon, UserIcon, ClipboardDocumentListIcon } from '../ui/Icons';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { View } from '../dashboard/Dashboard';
import { useNavigation } from '../../contexts/NavigationContext';

export const GlobalSearch: React.FC = () => {
  const { onNavigate } = useNavigation();
  const { supabaseClient } = useSupabase();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<GlobalSearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const openSearch = () => {
    setIsOpen(true);
    // Focus the input when the modal opens
    setTimeout(() => inputRef.current?.focus(), 100);
  };
  
  const closeSearch = () => {
    setIsOpen(false);
    setSearchTerm('');
    setResults(null);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeSearch();
      }
      // Keyboard shortcut to open search: Ctrl+K or Cmd+K
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        openSearch();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        closeSearch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
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
    if (searchTerm.trim().length < 2) {
      setResults(null);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    const debounceTimer = setTimeout(() => {
      performSearch(searchTerm);
    }, 300); // 300ms debounce

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, performSearch]);
  
  const handleSelect = (view: View, props: any) => {
    onNavigate(view, props);
    closeSearch();
  };

  const hasResults = results && (results.projects.length > 0 || results.tasks.length > 0 || results.teamMembers.length > 0);

  return (
    <>
      <button 
        onClick={openSearch}
        className="flex items-center space-x-2 rtl:space-x-reverse p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
        aria-label="ابحث في التطبيق"
      >
        <SearchIcon className="w-6 h-6" />
        <span className="hidden md:inline text-sm">بحث...</span>
        <kbd className="hidden md:inline text-xs font-sans font-semibold text-slate-400 border border-slate-300 dark:border-slate-600 rounded px-1.5 py-0.5">Ctrl+K</kbd>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center pt-20">
          <div ref={searchContainerRef} className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg max-h-[70vh] flex flex-col">
            <div className="relative p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="absolute inset-y-0 right-0 flex items-center pr-6 pointer-events-none">
                    {isLoading ? <LoadingSpinner className="text-sky-500"/> : <SearchIcon className="w-5 h-5 text-slate-400" />}
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="ابحث عن مشروع، مهمة، أو عضو فريق..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-2 pr-10 border-0 ring-0 focus:ring-0 text-md bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400"
                />
            </div>
            <div className="flex-1 overflow-y-auto">
                {results ? (
                    hasResults ? (
                         <div className="p-4 space-y-4">
                            {results.projects.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-semibold uppercase text-slate-400 mb-2 px-2">المشاريع</h3>
                                    {results.projects.map(p => (
                                        <div key={`proj-${p.id}`} onClick={() => handleSelect('projectDetail', { projectId: p.id })} className="flex items-center space-x-3 rtl:space-x-reverse p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                                            <FolderIcon className="w-5 h-5 text-sky-500"/>
                                            <span className="text-sm text-slate-700 dark:text-slate-200">{p.name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {results.tasks.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-semibold uppercase text-slate-400 mb-2 px-2">المهام</h3>
                                    {results.tasks.map(t => (
                                        <div key={`task-${t.id}`} onClick={() => handleSelect('projectDetail', { projectId: t.projectId, initialTaskIdToOpen: t.id })} className="flex items-center space-x-3 rtl:space-x-reverse p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                                            <ClipboardDocumentListIcon className="w-5 h-5 text-green-500"/>
                                            <span className="text-sm text-slate-700 dark:text-slate-200">{t.title}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {results.teamMembers.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-semibold uppercase text-slate-400 mb-2 px-2">أعضاء الفريق</h3>
                                    {results.teamMembers.map(m => (
                                        <div key={`member-${m.id}`} onClick={() => handleSelect('teamDetail', { memberId: m.id })} className="flex items-center space-x-3 rtl:space-x-reverse p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                                            <UserIcon className="w-5 h-5 text-indigo-500"/>
                                            <span className="text-sm text-slate-700 dark:text-slate-200">{m.name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-center text-slate-500 p-8">لم يتم العثور على نتائج.</p>
                    )
                ) : (
                    searchTerm.length > 1 && !isLoading && <p className="text-center text-slate-500 p-8">ابحث للعثور على النتائج.</p>
                )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
