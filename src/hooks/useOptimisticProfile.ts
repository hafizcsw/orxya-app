import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProfileUpdate {
  full_name?: string;
  avatar_url?: string;
  timezone?: string;
  language?: string;
  [key: string]: any;
}

export function useOptimisticUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: ProfileUpdate) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ['profile'] });
      const previousProfile = queryClient.getQueryData(['profile']);

      queryClient.setQueryData(['profile'], (old: any) => {
        if (!old) return { ...updates };
        return { ...old, ...updates };
      });

      return { previousProfile };
    },
    onError: (err, updates, context) => {
      queryClient.setQueryData(['profile'], context?.previousProfile);
      toast.error('فشل في تحديث الملف الشخصي');
    },
    onSuccess: () => {
      toast.success('تم تحديث الملف الشخصي بنجاح');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useOptimisticUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Record<string, any>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .update(settings)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (settings) => {
      await queryClient.cancelQueries({ queryKey: ['settings'] });
      const previousSettings = queryClient.getQueryData(['settings']);

      queryClient.setQueryData(['settings'], (old: any) => {
        if (!old) return settings;
        return { ...old, ...settings };
      });

      return { previousSettings };
    },
    onError: (err, settings, context) => {
      queryClient.setQueryData(['settings'], context?.previousSettings);
      toast.error('فشل في تحديث الإعدادات');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}
