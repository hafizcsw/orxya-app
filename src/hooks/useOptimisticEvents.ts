import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Event {
  id?: string;
  title: string;
  starts_at: string;
  ends_at: string;
  description?: string;
  location?: string;
  owner_id?: string;
  [key: string]: any;
}

export function useOptimisticCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (event: Event) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('events')
        .insert([{ ...event, owner_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (newEvent) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['events'] });

      // Snapshot previous value
      const previousEvents = queryClient.getQueryData(['events']);

      // Optimistically update
      const optimisticEvent = {
        ...newEvent,
        id: `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData(['events'], (old: any) => {
        if (!old) return [optimisticEvent];
        return [...old, optimisticEvent];
      });

      return { previousEvents };
    },
    onError: (err, newEvent, context) => {
      // Rollback on error
      queryClient.setQueryData(['events'], context?.previousEvents);
      toast.error('فشل في إضافة الحدث');
    },
    onSuccess: () => {
      toast.success('تم إضافة الحدث بنجاح');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useOptimisticUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Event> }) => {
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['events'] });
      const previousEvents = queryClient.getQueryData(['events']);

      queryClient.setQueryData(['events'], (old: any) => {
        if (!old) return old;
        return old.map((event: Event) =>
          event.id === id ? { ...event, ...updates } : event
        );
      });

      return { previousEvents };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['events'], context?.previousEvents);
      toast.error('فشل في تحديث الحدث');
    },
    onSuccess: () => {
      toast.success('تم تحديث الحدث بنجاح');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useOptimisticDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('events')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['events'] });
      const previousEvents = queryClient.getQueryData(['events']);

      queryClient.setQueryData(['events'], (old: any) => {
        if (!old) return old;
        return old.filter((event: Event) => event.id !== deletedId);
      });

      return { previousEvents };
    },
    onError: (err, deletedId, context) => {
      queryClient.setQueryData(['events'], context?.previousEvents);
      toast.error('فشل في حذف الحدث');
    },
    onSuccess: () => {
      toast.success('تم حذف الحدث بنجاح');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
