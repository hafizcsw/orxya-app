import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CurrentTask {
  id: string;
  title: string;
  category: string;
  starts_at: string;
  ends_at: string;
  remainingMinutes: number;
  progressPercent: number;
}

interface NextTask {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
}

export function useLiveToday(date?: Date) {
  const [currentTask, setCurrentTask] = useState<CurrentTask | null>(null);
  const [nextTask, setNextTask] = useState<NextTask | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  const dateStr = date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

  // Fetch current and next tasks
  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('today-realtime-data', {
        body: { date: dateStr }
      });

      if (error) throw error;

      setCurrentTask(data?.currentTask || null);
      setNextTask(data?.nextTask || null);
      
      if (data?.currentTask) {
        setTimeRemaining(data.currentTask.remainingMinutes);
        setProgress(data.currentTask.progressPercent);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to events table changes
  useEffect(() => {
    fetchTasks();

    const channel = supabase
      .channel('today-events')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `starts_at=gte.${dateStr}T00:00:00Z,starts_at=lt.${dateStr}T23:59:59Z`
        },
        () => {
          // Re-fetch when events change
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [dateStr]);

  // Update countdown timer every second
  useEffect(() => {
    if (!currentTask) return;

    const interval = setInterval(() => {
      const now = new Date();
      const endTime = new Date(currentTask.ends_at);
      const startTime = new Date(currentTask.starts_at);
      
      const totalDuration = (endTime.getTime() - startTime.getTime()) / 1000 / 60;
      const remaining = Math.max(0, (endTime.getTime() - now.getTime()) / 1000 / 60);
      const newProgress = Math.min(100, ((totalDuration - remaining) / totalDuration) * 100);

      setTimeRemaining(Math.round(remaining));
      setProgress(Math.round(newProgress));

      // Check if task has ended
      if (remaining <= 0) {
        fetchTasks();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentTask]);

  return {
    currentTask,
    nextTask,
    timeRemaining,
    progress,
    loading,
    refetch: fetchTasks
  };
}
