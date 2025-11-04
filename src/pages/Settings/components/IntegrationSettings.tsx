import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';

export function IntegrationSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">التكاملات</h2>
        <p className="text-sm text-muted-foreground">ربط التقويم مع خدمات خارجية</p>
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Google Calendar</h3>
              <p className="text-sm text-muted-foreground">مزامنة الأحداث مع Google Calendar</p>
            </div>
          </div>
          <Button variant="outline">الانتقال إلى الإعدادات</Button>
        </div>
      </Card>
    </div>
  );
}
