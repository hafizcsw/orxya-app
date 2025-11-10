import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AvatarUpload } from '@/components/AvatarUpload';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { CheckCircle2, ListTodo, TrendingUp, CalendarIcon, User, Mail, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PullToRefresh from 'react-simple-pull-to-refresh';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { user } = useAuth();
  const { t } = useTranslation(['profile']);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [accountCreated, setAccountCreated] = useState<string>('');
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    upcomingEvents: 0,
  });

  const fetchStats = async () => {
    if (!user) return;
    
    try {
      // Fetch profile data
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, created_at')
        .eq('id', user.id)
        .maybeSingle();
      
      if (profileError) {
        console.error('[Profile] Error fetching profile:', profileError);
        toast.error('فشل تحميل بيانات الملف الشخصي');
        return;
      }
      
      if (data) {
        setFullName(data.full_name ?? '');
        setAvatarUrl(data.avatar_url ?? null);
        setAccountCreated(data.created_at ?? '');
      }

      // Fetch statistics
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, status')
        .eq('owner_id', user.id);
      
      if (tasksError) {
        console.error('[Profile] Error fetching tasks:', tasksError);
      }
      
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id')
        .eq('owner_id', user.id)
        .gte('start_time', today.toISOString())
        .lte('start_time', nextWeek.toISOString());

      if (eventsError) {
        console.error('[Profile] Error fetching events:', eventsError);
      }

      setStats({
        totalTasks: tasks?.length || 0,
        completedTasks: tasks?.filter(t => t.status === 'done').length || 0,
        upcomingEvents: events?.length || 0,
      });
    } catch (error) {
      console.error('[Profile] Unexpected error:', error);
      toast.error('حدث خطأ غير متوقع في تحميل البيانات');
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user?.id]);

  const handleRefresh = async () => {
    await fetchStats();
    toast.success('تم تحديث الإحصائيات');
  };

  async function saveProfile() {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user.id);
      
      if (error) throw error;
      toast.success('تم حفظ التغييرات بنجاح');
    } catch (e: any) {
      console.error('[Profile] Error saving profile:', e);
      
      let errorMessage = 'فشل حفظ التغييرات';
      if (e?.message?.includes('network')) {
        errorMessage = 'خطأ في الاتصال بالإنترنت';
      } else if (e?.message?.includes('permission')) {
        errorMessage = 'ليس لديك صلاحية لهذه العملية';
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }).format(date);
  };

  const handleSignOut = async () => {
    if (isSigningOut) return;
    
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut({ scope: 'global' });
      toast.success('تم تسجيل الخروج بنجاح');
      setTimeout(() => {
        navigate('/auth', { replace: true });
      }, 300);
    } catch (error) {
      console.error('[Profile] Sign out error:', error);
      toast.error('فشل تسجيل الخروج');
      setIsSigningOut(false);
    }
  };
  if (!user) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center text-muted-foreground">
          {t('profile:messages.loginRequired')}
        </div>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh} pullingContent="">
      <div className="max-w-4xl mx-auto p-4 pb-24 space-y-6">
      {/* Header with Avatar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="flex flex-col items-center gap-4">
          <AvatarUpload 
            currentAvatarUrl={avatarUrl}
            onAvatarUpdate={(url) => setAvatarUrl(url)}
            size="lg"
            showUploadButton={true}
          />
          <div>
            <h1 className="text-2xl font-bold">{fullName || user.email}</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </motion.div>

      {/* Statistics Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 hover:border-blue-500/40 transition-all">
          <div className="flex flex-col items-center text-center gap-2">
            <ListTodo className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{stats.totalTasks}</p>
              <p className="text-xs text-muted-foreground">المهام</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20 hover:border-green-500/40 transition-all">
          <div className="flex flex-col items-center text-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{stats.completedTasks}</p>
              <p className="text-xs text-muted-foreground">مكتمل</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20 hover:border-purple-500/40 transition-all">
          <div className="flex flex-col items-center text-center gap-2">
            <CalendarIcon className="w-8 h-8 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">{stats.upcomingEvents}</p>
              <p className="text-xs text-muted-foreground">أحداث</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20 hover:border-orange-500/40 transition-all">
          <div className="flex flex-col items-center text-center gap-2">
            <TrendingUp className="w-8 h-8 text-orange-500" />
            <div>
              <p className="text-2xl font-bold">
                {stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}%
              </p>
              <p className="text-xs text-muted-foreground">إنجاز</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Profile Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            معلومات الحساب
          </h2>
          
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">الاسم الكامل</label>
              <input 
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground" 
                value={fullName} 
                onChange={e => setFullName(e.target.value)} 
                placeholder="أدخل اسمك الكامل"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block flex items-center gap-2">
                <Mail className="w-4 h-4" />
                البريد الإلكتروني
              </label>
              <input 
                className="w-full px-3 py-2 rounded-lg border border-input bg-muted text-muted-foreground" 
                value={user.email} 
                disabled
              />
            </div>

            <Button 
              onClick={saveProfile}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* Account Info */}
      {accountCreated && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">عضو منذ</span>
              <span className="font-medium">{formatDate(accountCreated)}</span>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Logout Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Button
          onClick={handleSignOut}
          disabled={isSigningOut}
          variant="destructive"
          className="w-full flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          {isSigningOut ? 'جاري تسجيل الخروج...' : 'تسجيل الخروج'}
        </Button>
      </motion.div>
      </div>
    </PullToRefresh>
  );
}
