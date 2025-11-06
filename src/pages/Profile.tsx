import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/lib/auth';
import { setTelemetryOn, track } from '@/lib/telemetry';
import { flushQueueOnce } from '@/lib/sync';
import { getQueued } from '@/lib/localdb/dexie';
import { rescheduleAllFromDB, ensureNotificationPerms } from '@/lib/notify';
import { getDeviceLocation } from '@/native/geo';
import ThemeControls from '@/components/ThemeControls';
import { ensureAISession, getAIConsents, updateAIConsents, computeAIStatus } from '@/lib/ai';
import { useGoogleAccount } from '@/hooks/useExternal';
import CalendarList from '@/components/CalendarList';
import GoogleCalendarCard from '@/components/GoogleCalendarCard';
import { AvatarUpload } from '@/components/AvatarUpload';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Bell, Calendar as CalendarIcon, Clock, ExternalLink, Loader2, LogOut, Moon, Sun, CheckCircle2, ListTodo, TrendingUp, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';

const tzGuess = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Dubai';

export default function Profile() {
  const { user } = useUser();
  const navigate = useNavigate();
  const { t } = useTranslation(['profile']);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [timezone, setTimezone] = useState(tzGuess);
  const [telemetry, setTelemetry] = useState(true);
  const [allowLocation, setAllowLocation] = useState(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [prayerMethod, setPrayerMethod] = useState('MWL');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [aiConsents, setAIConsents] = useState<{id?:string; consent_read_calendar:boolean; consent_write_calendar:boolean; consent_write_tasks:boolean} | null>(null);
  const [aiMsg, setAIMsg] = useState<string>("");
  const [calendarWriteback, setCalendarWriteback] = useState(false);
  const [calendars, setCalendars] = useState<any[]>([]);
  const [defaultCal, setDefaultCal] = useState<string>('');
  const [calLoading, setCalLoading] = useState(false);
  const [calMap, setCalMap] = useState<Record<string,string>>({
    task:'', meeting:'', ai_plan:'', prayer_block:''
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    upcomingEvents: 0,
    completedPrayers: 0
  });

  const tzList = useMemo(() => [
    'Asia/Dubai', 'UTC', 'Europe/Helsinki', 'Europe/London', 
    'Asia/Riyadh', 'Africa/Cairo', 'Asia/Doha', 'Asia/Kolkata'
  ], []);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name,currency,timezone,telemetry_enabled,allow_location,prayer_method,latitude,longitude,calendar_writeback,default_calendar_id,default_calendar_provider,default_calendar_name,avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      if (data) {
        setFullName(data.full_name ?? '');
        setCurrency(data.currency ?? 'USD');
        setTimezone(data.timezone ?? tzGuess);
        setTelemetry(!!data.telemetry_enabled);
        setTelemetryOn(!!data.telemetry_enabled);
        setAllowLocation(!!data.allow_location);
        setPrayerMethod(data.prayer_method ?? 'MWL');
        setLatitude(data.latitude?.toString() ?? '');
        setLongitude(data.longitude?.toString() ?? '');
        setCalendarWriteback(!!data.calendar_writeback);
        setDefaultCal(data.default_calendar_id ?? '');
        setAvatarUrl(data.avatar_url ?? null);
      }
      const q = await getQueued();
      setPendingCount(q.length);

      // Fetch user statistics
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 7);

      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, status')
        .eq('owner_id', user.id);
      
      const { data: events } = await supabase
        .from('events')
        .select('id')
        .eq('owner_id', user.id)
        .gte('start_time', today.toISOString())
        .lte('start_time', tomorrow.toISOString());

      setStats({
        totalTasks: tasks?.length || 0,
        completedTasks: tasks?.filter(t => t.status === 'done').length || 0,
        upcomingEvents: events?.length || 0,
        completedPrayers: 0
      });
    })();
  }, [user?.id, tzGuess]);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const sess = await ensureAISession();
      if (!sess) return;
      const c = await getAIConsents();
      if (c) setAIConsents(c as any);
    })();
  }, [user?.id]);

  async function save() {
    if (!user) return;
    setLoading(true); 
    setErr(null); 
    setMsg(null);
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: fullName || null,
        currency,
        timezone,
        telemetry_enabled: telemetry,
        allow_location: allowLocation,
        prayer_method: prayerMethod,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        calendar_writeback: calendarWriteback
      });
      if (error) throw error;
      setTelemetryOn(telemetry);
      setMsg(t('profile:messages.saveSuccess'));
      track('profile_saved', { currency, timezone, telemetry, prayerMethod });
    } catch (e: any) {
      setErr(e?.message ?? t('profile:messages.saveError'));
    } finally { 
      setLoading(false); 
    }
  }

  async function captureLocation() {
    setLoading(true);
    try {
      const loc = await getDeviceLocation();
      if (loc) {
        setLatitude(loc.lat.toString());
        setLongitude(loc.lon.toString());
        setMsg(t('profile:messages.locationSuccess'));
      } else {
        setErr(t('profile:messages.locationError'));
      }
    } catch (e: any) {
      setErr(e?.message ?? t('profile:messages.locationError'));
    } finally {
      setLoading(false);
    }
  }

  async function fetchCalendars() {
    setCalLoading(true);
    try {
      await supabase.functions.invoke('google-cal-list');
      const { data } = await supabase
        .from('external_calendars')
        .select('*')
        .eq('owner_id', user!.id)
        .order('primary_flag', { ascending: false });
      setCalendars(data ?? []);
      
      // Load existing mappings
      const { data: mappings } = await supabase
        .from('calendar_mapping')
        .select('*')
        .eq('owner_id', user!.id);
      if (mappings) {
        const map: Record<string, string> = {};
        mappings.forEach((m: any) => {
          map[m.kind] = m.calendar_id;
        });
        setCalMap(map);
      }
    } catch (e) {
      console.error('Failed to fetch calendars:', e);
    } finally {
      setCalLoading(false);
    }
  }

  async function saveDefaultCal() {
    if (!defaultCal) return;
    setCalLoading(true);
    try {
      const selected = calendars.find(c => c.calendar_id === defaultCal);
      await supabase.functions.invoke('calendar-set-default', {
        body: {
          provider: 'google',
          calendar_id: defaultCal,
          calendar_name: selected?.calendar_name ?? null
        }
      });
      setMsg(t('profile:messages.saveSuccess'));
      setCalendarWriteback(true);
      setTimeout(() => setMsg(null), 3000);
    } catch (e: any) {
      setErr(e?.message ?? t('profile:messages.saveError'));
    } finally {
      setCalLoading(false);
    }
  }

  async function saveMappings() {
    setCalLoading(true);
    try {
      const mappings = Object.keys(calMap)
        .filter(k => !!calMap[k])
        .map(k => ({ kind: k, calendar_id: calMap[k] }));
      await supabase.functions.invoke('calendar-map-set', { body: { mappings } });
      setMsg(t('profile:messages.saveSuccess'));
      setTimeout(() => setMsg(null), 3000);
    } catch (e: any) {
      setErr(e?.message ?? t('profile:messages.saveError'));
    } finally {
      setCalLoading(false);
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('تم تسجيل الخروج بنجاح');
      navigate('/auth', { replace: true });
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast.error('فشل تسجيل الخروج');
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
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header with Sign Out */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {t('profile:title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t('profile:subtitle')}</p>
        </div>
        <Button 
          variant="destructive" 
          onClick={handleSignOut}
          className="flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
        >
          <LogOut className="w-4 h-4" />
          تسجيل الخروج
        </Button>
      </motion.div>

      {/* Statistics Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 hover:border-blue-500/40 transition-all hover:scale-105 cursor-pointer group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">المهام الكلية</p>
              <p className="text-2xl font-bold mt-1">{stats.totalTasks}</p>
            </div>
            <ListTodo className="w-8 h-8 text-blue-500 group-hover:scale-110 transition-transform" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20 hover:border-green-500/40 transition-all hover:scale-105 cursor-pointer group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">المهام المكتملة</p>
              <p className="text-2xl font-bold mt-1">{stats.completedTasks}</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-green-500 group-hover:scale-110 transition-transform" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20 hover:border-purple-500/40 transition-all hover:scale-105 cursor-pointer group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">الأحداث القادمة</p>
              <p className="text-2xl font-bold mt-1">{stats.upcomingEvents}</p>
            </div>
            <CalendarIcon className="w-8 h-8 text-purple-500 group-hover:scale-110 transition-transform" />
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20 hover:border-orange-500/40 transition-all hover:scale-105 cursor-pointer group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">معدل الإنجاز</p>
              <p className="text-2xl font-bold mt-1">
                {stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}%
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-500 group-hover:scale-110 transition-transform" />
          </div>
        </Card>
      </motion.div>

      {/* Avatar Section - Enhanced */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 hover:shadow-xl transition-all">
          <div className="text-sm text-muted-foreground font-medium mb-4 flex items-center gap-2">
            <div className="w-1 h-4 bg-primary rounded-full" />
            {t('profile:actions.uploadAvatar')}
          </div>
          <div className="flex flex-col items-center">
            <AvatarUpload 
              currentAvatarUrl={avatarUrl}
              onAvatarUpdate={(url) => setAvatarUrl(url)}
              size="lg"
              showUploadButton={true}
            />
            <div className="mt-4 text-center">
              <p className="font-semibold text-lg">{fullName || user.email}</p>
              <p className="text-xs text-muted-foreground mt-1">{user.email}</p>
            </div>
          </div>
        </Card>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Basic Information - Enhanced */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6 space-y-4 hover:shadow-lg transition-all">
            <div className="text-sm text-muted-foreground font-medium flex items-center gap-2">
              <div className="w-1 h-4 bg-primary rounded-full" />
              {t('profile:sections.basic')}
            </div>
          
          <label className="block space-y-2">
            <span className="text-sm font-medium">{t('profile:fields.displayName')}</span>
            <input 
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground" 
              value={fullName} 
              onChange={e => setFullName(e.target.value)} 
              placeholder={t('profile:fields.displayName')}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">{t('profile:fields.currency')}</span>
            <select 
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground" 
              value={currency} 
              onChange={e => setCurrency(e.target.value)}
            >
              <option>USD</option>
              <option>AED</option>
              <option>SAR</option>
              <option>EGP</option>
              <option>EUR</option>
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">{t('profile:fields.timezone')}</span>
            <select 
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground" 
              value={timezone} 
              onChange={e => setTimezone(e.target.value)}
            >
              {tzList.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">{t('profile:fields.prayerMethod')}</span>
            <select 
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground" 
              value={prayerMethod} 
              onChange={e => setPrayerMethod(e.target.value)}
            >
              <option value="MWL">Muslim World League</option>
              <option value="ISNA">Islamic Society of North America</option>
              <option value="Egypt">Egyptian General Authority</option>
              <option value="Makkah">Umm Al-Qura University, Makkah</option>
              <option value="Karachi">University of Islamic Sciences, Karachi</option>
            </select>
          </label>

          <div className="space-y-2">
            <span className="text-sm font-medium">{t('profile:sections.location')}</span>
            <div className="grid grid-cols-2 gap-2">
              <input 
                className="px-3 py-2 rounded-lg border border-input bg-background text-foreground" 
                value={latitude} 
                onChange={e => setLatitude(e.target.value)} 
                placeholder={t('profile:fields.latitude')}
                type="number"
                step="any"
              />
              <input 
                className="px-3 py-2 rounded-lg border border-input bg-background text-foreground" 
                value={longitude} 
                onChange={e => setLongitude(e.target.value)} 
                placeholder={t('profile:fields.longitude')}
                type="number"
                step="any"
              />
            </div>
            <button 
              className="w-full px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors text-sm"
              onClick={captureLocation}
              disabled={loading}
            >
              📍 {t('profile:actions.captureLocation')}
            </button>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              className="w-4 h-4 rounded border-input" 
              checked={telemetry} 
              onChange={e => setTelemetry(e.target.checked)} 
            />
            <span className="text-sm">{t('profile:fields.telemetry')}</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              className="w-4 h-4 rounded border-input" 
              checked={allowLocation} 
              onChange={e => setAllowLocation(e.target.checked)} 
            />
            <span className="text-sm">{t('profile:sections.location')}</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button 
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50" 
              disabled={loading} 
              onClick={save}
            >
              {loading ? t('profile:actions.saving') : t('profile:actions.save')}
            </button>
              {msg && <span className="text-green-700 dark:text-green-400 text-sm self-center">{msg}</span>}
              {err && <span className="text-red-700 dark:text-red-400 text-sm self-center">{err}</span>}
            </div>
          </Card>
        </motion.div>

        {/* Quick Actions - Enhanced */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6 space-y-4 hover:shadow-lg transition-all">
            <div className="text-sm text-muted-foreground font-medium flex items-center gap-2">
              <div className="w-1 h-4 bg-primary rounded-full" />
              {t('profile:sections.advanced')}
            </div>
          
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-sm">
              {pendingCount} {t('profile:actions.flushQueue')}
            </div>
          </div>

          <div className="space-y-2">
            <button 
              className="w-full px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors text-sm"
              onClick={async () => {
                await flushQueueOnce();
                const q = await getQueued(); 
                setPendingCount(q.length);
              }}
            >
              {t('profile:actions.flushQueue')}
            </button>
            
            <button 
              className="w-full px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors text-sm"
              onClick={async () => {
                await ensureNotificationPerms();
                await rescheduleAllFromDB();
              }}
            >
              {t('profile:actions.rescheduleReminders')}
            </button>
            
            <button 
              className="w-full px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors text-sm"
              onClick={() => {
                setTelemetryOn(false);
                setTelemetry(false);
              }}
            >
              {t('profile:actions.disableTelemetry')}
            </button>
          </div>

          <div className="p-3 rounded-lg bg-muted/30 border border-border">
            <div className="text-xs text-muted-foreground space-y-1">
              <div>ID: <span className="font-mono">{user.id}</span></div>
              <div>{t('profile:fields.email')}: {user.email}</div>
            </div>
          </div>
          </Card>
        </motion.div>
      </div>

      {/* Theme Controls - Enhanced */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="p-6 space-y-4 hover:shadow-lg transition-all">
          <div className="text-sm text-muted-foreground font-medium flex items-center gap-2">
            <div className="w-1 h-4 bg-primary rounded-full" />
            {t('profile:sections.preferences')}
          </div>
          <ThemeControls />
        </Card>
      </motion.div>

      {/* AI Permissions - Enhanced */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="p-6 space-y-4 hover:shadow-lg transition-all bg-gradient-to-br from-violet-500/5 to-violet-600/5 border-violet-500/20">
          <div className="text-sm text-muted-foreground font-medium flex items-center gap-2">
            <div className="w-1 h-4 bg-violet-500 rounded-full" />
            {t('profile:sections.ai')}
          </div>
        <p className="text-xs text-muted-foreground">{t('profile:ai.description')}</p>
        <label className="flex items-center gap-2 cursor-pointer">
          <input 
            type="checkbox"
            className="w-4 h-4 rounded border-input"
            checked={!!aiConsents?.consent_read_calendar}
            onChange={async (e)=>{
              const ok = await updateAIConsents({ consent_read_calendar: e.target.checked });
              if (ok.ok) setAIConsents(s=>s?{...s,consent_read_calendar:e.target.checked}:s);
              setAIMsg(ok.ok ? t('profile:messages.saveSuccess') : t('profile:messages.saveError'));
              setTimeout(() => setAIMsg(""), 2000);
            }} 
          />
          <span className="text-sm">{t('profile:ai.title')}</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input 
            type="checkbox"
            className="w-4 h-4 rounded border-input"
            checked={!!aiConsents?.consent_write_calendar}
            onChange={async (e)=>{
              const ok = await updateAIConsents({ consent_write_calendar: e.target.checked });
              if (ok.ok) setAIConsents(s=>s?{...s,consent_write_calendar:e.target.checked}:s);
              setAIMsg(ok.ok ? t('profile:messages.saveSuccess') : t('profile:messages.saveError'));
              setTimeout(() => setAIMsg(""), 2000);
            }} 
          />
          <span className="text-sm">{t('profile:ai.enableAll')}</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input 
            type="checkbox"
            className="w-4 h-4 rounded border-input"
            checked={!!aiConsents?.consent_write_tasks}
            onChange={async (e)=>{
              const ok = await updateAIConsents({ consent_write_tasks: e.target.checked });
              if (ok.ok) setAIConsents(s=>s?{...s,consent_write_tasks:e.target.checked}:s);
              setAIMsg(ok.ok ? t('profile:messages.saveSuccess') : t('profile:messages.saveError'));
              setTimeout(() => setAIMsg(""), 2000);
            }} 
          />
          <span className="text-sm">{t('profile:ai.disableAll')}</span>
        </label>
        {aiMsg && <div className="text-sm text-muted-foreground">{aiMsg}</div>}
        </Card>
      </motion.div>

      {/* Quick Settings Links - Enhanced */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="p-6 space-y-3 hover:shadow-lg transition-all">
          <div className="text-sm text-muted-foreground font-medium mb-2 flex items-center gap-2">
            <div className="w-1 h-4 bg-primary rounded-full" />
            {t('profile:sections.advanced')}
          </div>
        
        <Link to="/settings/notifications">
          <Button variant="outline" className="w-full justify-start">
            <Bell className="mr-2 h-4 w-4" />
            {t('profile:links.notifications')}
          </Button>
        </Link>
        
        <Link to="/settings/prayer">
          <Button variant="outline" className="w-full justify-start">
            <Clock className="mr-2 h-4 w-4" />
            {t('profile:links.prayer')}
          </Button>
        </Link>

        <Link to="/settings/external">
          <Button variant="outline" className="w-full justify-start">
          <CalendarIcon className="mr-2 h-4 w-4" />
          {t('profile:links.externalCalendars')}
        </Button>
        </Link>
        </Card>
      </motion.div>

      {/* External Integrations - Enhanced */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Card className="p-6 space-y-4 hover:shadow-lg transition-all">
          <div className="text-sm text-muted-foreground font-medium flex items-center gap-2">
            <div className="w-1 h-4 bg-primary rounded-full" />
            {t('profile:sections.integrations')}
          </div>
          <GoogleCalendarCard />
        </Card>
      </motion.div>
    </div>
  );
}
