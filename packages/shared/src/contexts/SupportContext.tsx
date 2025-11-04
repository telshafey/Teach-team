import React, { createContext, useContext, ReactNode, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SupportTicket, TicketComment } from '../types';
import { useSupabase } from './SupabaseContext';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import * as api from '../services/apiService';
import { useRealtime } from './RealtimeContext';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

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
  const queryClient = useQueryClient();

  const enabled = !!supabaseClient && !!currentUser;

  const { data: tickets = [], isLoading: isLoadingTickets } = useQuery<SupportTicket[]>({
    queryKey: ['support_tickets'],
    queryFn: async () => {
        const data = await api.getAll<SupportTicket>(supabaseClient!, 'support_tickets');
        return data.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    },
    enabled,
  });

  const { data: comments = [], isLoading: isLoadingComments } = useQuery<TicketComment[]>({
    queryKey: ['ticket_comments'],
    queryFn: () => api.getAll<TicketComment>(supabaseClient!, 'ticket_comments'),
    enabled,
  });

  const isLoading = isLoadingTickets || isLoadingComments;

  useEffect(() => {
    const handleTableChange = <T extends {id: string}>(queryKey: string) => (payload: RealtimePostgresChangesPayload<T>) => {
        queryClient.setQueryData([queryKey], (oldData: T[] | undefined) => {
            if (oldData === undefined) return [];
            if (payload.eventType === 'INSERT') {
                if (oldData.some(item => item.id === payload.new.id)) return oldData;
                return [payload.new, ...oldData];
            }
            if (payload.eventType === 'UPDATE') {
                return oldData.map(item => item.id === payload.new.id ? payload.new : item);
            }
            if (payload.eventType === 'DELETE') {
                 const oldId = (payload.old as { id: string }).id;
                return oldData.filter(item => item.id !== oldId);
            }
            return oldData;
        });

        // Re-sort tickets on any change to maintain order by updatedAt
        if (queryKey === 'support_tickets') {
             queryClient.setQueryData(['support_tickets'], (data: SupportTicket[] | undefined) => {
                return data?.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            });
        }
    };

    const unsubTickets = subscribe('support_tickets', handleTableChange<SupportTicket>('support_tickets'));
    const unsubComments = subscribe('ticket_comments', handleTableChange<TicketComment>('ticket_comments'));

    return () => {
      unsubTickets();
      unsubComments();
    };
  }, [subscribe, queryClient]);

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
      await updateTicket(data.ticketId, {}); 
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
