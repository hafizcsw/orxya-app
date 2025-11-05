import GoogleCalendarCard from '@/components/GoogleCalendarCard';

export function IntegrationSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">التكاملات</h2>
        <p className="text-sm text-muted-foreground">ربط التقويم مع خدمات خارجية</p>
      </div>

      <GoogleCalendarCard />
    </div>
  );
}
