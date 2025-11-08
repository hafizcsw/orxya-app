import { useState, useEffect } from 'react';
import { TodayDataManager } from '@/lib/today-data-manager';

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

  // Fetch current and next tasks using TodayDataManager
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const data = await TodayDataManager.fetchTodayData(date);

      setCurrentTask(data?.currentTask || null);
      setNextTask(data?.nextTask || null);
      
      if (data?.currentTask) {
        setTimeRemaining(data.currentTask.remainingMinutes);
        setProgress(data.currentTask.progressPercent);
      } else {
        setTimeRemaining(0);
        setProgress(0);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      // Don't throw - just set empty state
      setCurrentTask(null);
      setNextTask(null);
      setTimeRemaining(0);
      setProgress(0);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and when date changes
  useEffect(() => {
    fetchTasks();
    
    // Clear cache when date changes
    return () => {
      TodayDataManager.clearCache(`today-data-${dateStr}`);
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
