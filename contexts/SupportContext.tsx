import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { SupportTicket, TicketComment, TicketStatus } from '../types';
import { useSupabase } from './SupabaseContext';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import * as api from '../services/apiService';
import { useRealtime } from './RealtimeContext';

export interface SupportContextType {
  tickets: SupportTicket[];
  comments: TicketComment[];
  isLoading: boolean;
  createTicket: (data: Omit<SupportTicket, 'id' | 'creatorId' | 'createdAt' | 'updatedAt' | 'status'>) => Promise<void>;
  updateTicket: (id: string, updates: Partial<SupportTicket>) => Promise<void>;
  addComment: (data: Omit<TicketComment, 'id' | 'authorId' | 'createdAt'>) => Promise<void>;
}

const SupportContext = createContext<SupportContextType | undefined>(undefined);

export const SupportProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { supabaseClient } = useSupabase();
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const { subscribe } = useRealtime();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!supabaseClient || !currentUser) return;
    
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [fetchedTickets, fetchedComments] = await Promise.all([
          api.getAll<SupportTicket>(supabaseClient, 'support_tickets'),
          api.getAll<TicketComment>(supabaseClient, 'ticket_comments'),
        ]);
        setTickets(fetchedTickets.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
        setComments(fetchedComments);
      } catch (error: any) {
        addToast(`Failed to fetch support data: ${error.message}`, 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [supabaseClient, currentUser, addToast]);
  
  useEffect(() => {
    const handleTicketChange = (payload: any) => {
      if (payload.eventType === 'INSERT') {
        setTickets(prev => [payload.new, ...prev.filter(t => t.id !== payload.new.id)]);
      } else if (payload.eventType === 'UPDATE') {
        setTickets(prev => prev.map(t => t.id === payload.new.id ? payload.new : t).sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
      } else if (payload.eventType === 'DELETE') {
        setTickets(prev => prev.filter(t => t.id !== payload.old.id));
      }
    };
    const handleCommentChange = (payload: any) => {
      if (payload.eventType === 'INSERT') {
        setComments(prev => [...prev.filter(c => c.id !== payload.new.id), payload.new]);
      } else if (payload.eventType === 'DELETE') {
        setComments(prev => prev.filter(c => c.id !== payload.old.id));
      }
    };

    const unsubTickets = subscribe('support_tickets', handleTicketChange);
    const unsubComments = subscribe('ticket_comments', handleCommentChange);

    return () => {
      unsubTickets();
      unsubComments();
    };
  }, [subscribe]);

  const createTicket = useCallback(async (data: Omit<SupportTicket, 'id' | 'creatorId' | 'createdAt' | 'updatedAt' | 'status'>) => {
    if (!supabaseClient || !currentUser) return;
    try {
      const now = new Date().toISOString();
      const newTicketData: Partial<SupportTicket> = {
        ...data,
        creatorId: currentUser.id,
        status: 'open',
        createdAt: now,
        updatedAt: now,
      };
      await api.insert<SupportTicket>(supabaseClient, 'support_tickets', newTicketData);
      addToast('تم إنشاء تذكرة الدعم بنجاح.', 'success');
    } catch (error: any) {
      addToast(`فشل إنشاء التذكرة: ${error.message}`, 'error');
      throw error;
    }
  }, [supabaseClient, currentUser, addToast]);

  const updateTicket = useCallback(async (id: string, updates: Partial<SupportTicket>) => {
    if (!supabaseClient) return;
    try {
      await api.update<SupportTicket>(supabaseClient, 'support_tickets', id, { ...updates, updatedAt: new Date().toISOString() });
      addToast('تم تحديث التذكرة بنجاح.', 'success');
    } catch (error: any) {
      addToast(`فشل تحديث التذكرة: ${error.message}`, 'error');
      throw error;
    }
  }, [supabaseClient, addToast]);
  
  const addComment = useCallback(async (data: Omit<TicketComment, 'id' | 'authorId' | 'createdAt'>) => {
    if (!supabaseClient || !currentUser) return;
    try {
      const newCommentData = {
        ...data,
        authorId: currentUser.id,
        createdAt: new Date().toISOString(),
      };
      await api.insert<TicketComment>(supabaseClient, 'ticket_comments', newCommentData);
      await updateTicket(data.ticketId, {}); // Just to update the 'updatedAt' timestamp
    } catch (error: any) {
      addToast(`فشل إضافة التعليق: ${error.message}`, 'error');
      throw error;
    }
  }, [supabaseClient, currentUser, addToast, updateTicket]);


  const value = {
    tickets,
    comments,
    isLoading,
    createTicket,
    updateTicket,
    addComment,
  };

  return <SupportContext.Provider value={value}>{children}</SupportContext.Provider>;
};

export const useSupportContext = () => {
  const context = useContext(SupportContext);
  if (context === undefined) {
    throw new Error('useSupportContext must be used within a SupportProvider');
  }
  return context;
};
