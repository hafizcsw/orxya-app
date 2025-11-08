import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Expense {
  id?: string;
  amount: number;
  category: string;
  note?: string;
  entry_date: string;
  type: 'expense';
  owner_id?: string;
  [key: string]: any;
}

export function useOptimisticCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expense: Expense) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('finance_entries')
        .insert([{ 
          ...expense, 
          owner_id: user.id,
          amount_usd: expense.amount,
          type: 'expense'
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (newExpense) => {
      await queryClient.cancelQueries({ queryKey: ['expenses'] });
      const previousExpenses = queryClient.getQueryData(['expenses']);

      const optimisticExpense = {
        ...newExpense,
        id: `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData(['expenses'], (old: any) => {
        if (!old) return [optimisticExpense];
        return [optimisticExpense, ...old];
      });

      return { previousExpenses };
    },
    onError: (err, newExpense, context) => {
      queryClient.setQueryData(['expenses'], context?.previousExpenses);
      toast.error('فشل في إضافة المصروف');
    },
    onSuccess: () => {
      toast.success('تم إضافة المصروف بنجاح');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['finance_entries'] });
    },
  });
}

export function useOptimisticDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('finance_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['expenses'] });
      const previousExpenses = queryClient.getQueryData(['expenses']);

      queryClient.setQueryData(['expenses'], (old: any) => {
        if (!old) return old;
        return old.filter((expense: Expense) => expense.id !== deletedId);
      });

      return { previousExpenses };
    },
    onError: (err, deletedId, context) => {
      queryClient.setQueryData(['expenses'], context?.previousExpenses);
      toast.error('فشل في حذف المصروف');
    },
    onSuccess: () => {
      toast.success('تم حذف المصروف');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['finance_entries'] });
    },
  });
}
