import { useState, useEffect } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface TaskList {
  id: string;
  title: string;
  color: string | null;
  is_default: boolean;
}

export function TaskSettings() {
  const { settings, updateSettings } = useSettings();
  const [taskLists, setTaskLists] = useState<TaskList[]>([]);
  const [newListTitle, setNewListTitle] = useState('');

  useEffect(() => {
    loadTaskLists();
  }, []);

  const loadTaskLists = async () => {
    const { data } = await supabase
      .from('task_lists')
      .select('*')
      .order('created_at');
    
    if (data) setTaskLists(data);
  };

  const createTaskList = async () => {
    if (!newListTitle.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('task_lists')
      .insert([{ title: newListTitle, owner_id: user.id }]);

    if (error) {
      toast.error('فشل إنشاء القائمة');
    } else {
      toast.success('تم إنشاء القائمة بنجاح');
      setNewListTitle('');
      loadTaskLists();
    }
  };

  const deleteTaskList = async (id: string) => {
    const { error } = await supabase
      .from('task_lists')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('فشل حذف القائمة');
    } else {
      toast.success('تم حذف القائمة');
      loadTaskLists();
    }
  };

  const setDefaultList = async (id: string) => {
    await updateSettings({ default_task_list_id: id });
    toast.success('تم تعيين القائمة الافتراضية');
  };

  if (!settings) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">إعدادات المهام</h2>
        <p className="text-sm text-muted-foreground">إدارة قوائم المهام والإعدادات</p>
      </div>

      <Card className="p-6 space-y-6">
        <div className="space-y-3">
          <Label>قوائم المهام</Label>
          <div className="space-y-2">
            {taskLists.map((list) => (
              <div key={list.id} className="flex items-center justify-between p-3 border rounded-lg">
                <span className="font-medium">{list.title}</span>
                <div className="flex gap-2">
                  {settings.default_task_list_id === list.id ? (
                    <span className="text-xs text-primary">افتراضي</span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDefaultList(list.id)}
                    >
                      تعيين كافتراضي
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteTaskList(list.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="اسم القائمة الجديدة"
            value={newListTitle}
            onChange={(e) => setNewListTitle(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && createTaskList()}
          />
          <Button onClick={createTaskList}>
            <Plus className="w-4 h-4 ml-2" />
            إضافة قائمة
          </Button>
        </div>
      </Card>
    </div>
  );
}
