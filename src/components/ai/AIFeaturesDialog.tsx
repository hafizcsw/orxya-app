import { useState } from 'react';
import { Brain, Sparkles, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SmartDailyPlan } from './SmartDailyPlan';
import { AutopilotLearningCard } from './AutopilotLearningCard';
import { PrayerWindowsCard } from '@/components/prayer/PrayerWindowsCard';
import { PrayerAwareScheduler } from '@/components/prayer/PrayerAwareScheduler';

export function AIFeaturesDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="gap-2 bg-primary/5 hover:bg-primary/10 border-primary/20"
        >
          <Sparkles className="w-4 h-4 text-primary" />
          المساعد الذكي
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            المساعد الذكي - AI Assistant
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="planner" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="planner">المخطط</TabsTrigger>
            <TabsTrigger value="prayer">الصلاة 🕌</TabsTrigger>
            <TabsTrigger value="windows">الأوقات</TabsTrigger>
            <TabsTrigger value="learning">التعلم</TabsTrigger>
          </TabsList>

          <TabsContent value="planner" className="space-y-4 mt-4">
            <SmartDailyPlan />
          </TabsContent>

          <TabsContent value="prayer" className="space-y-4 mt-4">
            <PrayerAwareScheduler />
          </TabsContent>

          <TabsContent value="windows" className="space-y-4 mt-4">
            <PrayerWindowsCard />
          </TabsContent>

          <TabsContent value="learning" className="space-y-4 mt-4">
            <AutopilotLearningCard />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
