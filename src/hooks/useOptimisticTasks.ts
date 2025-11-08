import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Task {
  id?: string;
  title: string;
  status?: string;
  due_date?: string;
  project_id?: string;
  owner_id?: string;
  [key: string]: any;
}

interface TaskList {
  id?: string;
  title: string;
  owner_id?: string;
  [key: string]: any;
}

export function useOptimisticCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: Task) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const taskData = {
        ...task,
        owner_id: user.id,
        project_id: task.project_id || '' // Ensure project_id is always set
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert([taskData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (newTask) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousTasks = queryClient.getQueryData(['tasks']);

      const optimisticTask = {
        ...newTask,
        id: `temp-${Date.now()}`,
        status: 'todo',
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData(['tasks'], (old: any) => {
        if (!old) return [optimisticTask];
        return [...old, optimisticTask];
      });

      return { previousTasks };
    },
    onError: (err, newTask, context) => {
      queryClient.setQueryData(['tasks'], context?.previousTasks);
      toast.error('فشل في إضافة المهمة');
    },
    onSuccess: () => {
      toast.success('تم إضافة المهمة بنجاح');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useOptimisticToggleTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousTasks = queryClient.getQueryData(['tasks']);

      queryClient.setQueryData(['tasks'], (old: any) => {
        if (!old) return old;
        return old.map((task: Task) =>
          task.id === id ? { ...task, status } : task
        );
      });

      return { previousTasks };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['tasks'], context?.previousTasks);
      toast.error('فشل في تحديث حالة المهمة');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useOptimisticCreateTaskList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskList: TaskList) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('task_lists')
        .insert([{ ...taskList, owner_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (newList) => {
      await queryClient.cancelQueries({ queryKey: ['task_lists'] });
      const previousLists = queryClient.getQueryData(['task_lists']);

      const optimisticList = {
        ...newList,
        id: `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData(['task_lists'], (old: any) => {
        if (!old) return [optimisticList];
        return [...old, optimisticList];
      });

      return { previousLists };
    },
    onError: (err, newList, context) => {
      queryClient.setQueryData(['task_lists'], context?.previousLists);
      toast.error('فشل في إنشاء القائمة');
    },
    onSuccess: () => {
      toast.success('تم إنشاء القائمة بنجاح');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['task_lists'] });
    },
  });
}

export function useOptimisticDeleteTaskList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('task_lists')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['task_lists'] });
      const previousLists = queryClient.getQueryData(['task_lists']);

      queryClient.setQueryData(['task_lists'], (old: any) => {
        if (!old) return old;
        return old.filter((list: TaskList) => list.id !== deletedId);
      });

      return { previousLists };
    },
    onError: (err, deletedId, context) => {
      queryClient.setQueryData(['task_lists'], context?.previousLists);
      toast.error('فشل في حذف القائمة');
    },
    onSuccess: () => {
      toast.success('تم حذف القائمة');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['task_lists'] });
    },
  });
}
