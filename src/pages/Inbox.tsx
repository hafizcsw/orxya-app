import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from '@/contexts/AuthContext';
import { Bell, Mail, MessageCircle, Check, X } from "lucide-react";
import { Toast } from "@/components/Toast";
import { useTranslation } from "react-i18next";
import PullToRefresh from 'react-simple-pull-to-refresh';
import { toast as showToast } from 'sonner';

type Notification = {
  id: string;
  title: string;
  body: string;
  channel: string;
  status: string;
  scheduled_at: string;
  sent_at: string | null;
  enabled: boolean;
};

const Inbox = () => {
  const { user } = useAuth();
  const { t } = useTranslation('inbox');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [channels, setChannels] = useState({
    local: true,
    whatsapp: false,
    email: false
  });

  useEffect(() => {
    if (user) {
      loadNotifications();
      loadChannelPreferences();
    }
  }, [user]);

  const handleRefresh = async () => {
    await Promise.all([
      loadNotifications(),
      loadChannelPreferences()
    ]);
    showToast.success('تم تحديث الإشعارات');
  };

  async function loadNotifications() {
    if (!user) return;

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("owner_id", user.id)
      .order("scheduled_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setNotifications(data);
    }
  }

  async function loadChannelPreferences() {
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (data) {
      // Load preferences from profile or localStorage
      const prefs = {
        local: true,
        whatsapp: localStorage.getItem("notify_whatsapp") === "true",
        email: localStorage.getItem("notify_email") === "true"
      };
      setChannels(prefs);
    }
  }

  async function toggleChannel(channel: "local" | "whatsapp" | "email") {
    const newValue = !channels[channel];
    setChannels(prev => ({ ...prev, [channel]: newValue }));
    localStorage.setItem(`notify_${channel}`, String(newValue));
    setToast(t(newValue ? 'channelEnabled' : 'channelDisabled', { channel }));
  }

  async function toggleNotification(id: string, currentEnabled: boolean) {
    const { error } = await supabase
      .from("notifications")
      .update({ enabled: !currentEnabled })
      .eq("id", id);

    if (!error) {
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, enabled: !currentEnabled } : n)
      );
      setToast(t(currentEnabled ? 'notificationDisabled' : 'notificationEnabled'));
    }
  }

  function getChannelIcon(channel: string) {
    switch (channel) {
      case "whatsapp": return <MessageCircle className="w-4 h-4" />;
      case "email": return <Mail className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "sent": return "text-green-600";
      case "scheduled": return "text-blue-600";
      case "failed": return "text-red-600";
      default: return "text-gray-600";
    }
  }

  return (
    <PullToRefresh onRefresh={handleRefresh} pullingContent="">
      <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6" />
          <h1 className="text-3xl font-bold">{t('notificationCenter')}</h1>
        </div>

        {/* Channel Controls */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl border bg-white">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                <span className="font-semibold">{t('local')}</span>
              </div>
              <button
                onClick={() => toggleChannel("local")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  channels.local ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    channels.local ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">{t('localDescription')}</p>
          </div>

          <div className="p-4 rounded-2xl border bg-white">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-green-600" />
                <span className="font-semibold">{t('whatsapp')}</span>
              </div>
              <button
                onClick={() => toggleChannel("whatsapp")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  channels.whatsapp ? "bg-green-600" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    channels.whatsapp ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">{t('whatsappDescription')}</p>
          </div>

          <div className="p-4 rounded-2xl border bg-white">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" />
                <span className="font-semibold">{t('email')}</span>
              </div>
              <button
                onClick={() => toggleChannel("email")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  channels.email ? "bg-blue-600" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    channels.email ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">{t('emailDescription')}</p>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">{t('scheduledNotifications')} ({notifications.length})</h2>
          
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground rounded-2xl border bg-white">
              {t('empty')}
            </div>
          ) : (
            notifications.map(notif => (
              <div
                key={notif.id}
                className={`p-4 rounded-xl border bg-white flex items-start gap-3 ${
                  !notif.enabled ? "opacity-50" : ""
                }`}
              >
                <div className="mt-1">{getChannelIcon(notif.channel)}</div>
                
                <div className="flex-1">
                  <div className="font-semibold">{notif.title}</div>
                  {notif.body && <div className="text-sm text-muted-foreground mt-1">{notif.body}</div>}
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    <span className={getStatusColor(notif.status)}>
                      {notif.status === "sent" ? t('sent') : 
                       notif.status === "scheduled" ? t('scheduled') : 
                       notif.status === "failed" ? t('failed') : notif.status}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(notif.scheduled_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => toggleNotification(notif.id, notif.enabled)}
                  className={`p-2 rounded-lg ${
                    notif.enabled ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}
                >
                  {notif.enabled ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </button>
              </div>
            ))
          )}
        </div>
        </div>

        {toast && <Toast msg={toast} />}
      </div>
    </PullToRefresh>
  );
};

export default Inbox;
