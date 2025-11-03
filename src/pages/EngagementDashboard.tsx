// Epic 10: Engagement Metrics Dashboard
import { useState, useEffect } from "react";
import { Activity, TrendingUp, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";

interface EngagementMetric {
  day: string;
  events_count: number;
  widget_taps: number;
  tile_uses: number;
  ai_plans: number;
  ai_resolves: number;
  ai_briefs: number;
  page_views: number;
  unique_features_used: number;
}

export default function EngagementDashboard() {
  const [metrics, setMetrics] = useState<EngagementMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const endDate = new Date();
      const startDate = subDays(endDate, 30);

      const { data, error } = await supabase.rpc("get_engagement_metrics", {
        p_user_id: user.id,
        p_start: format(startDate, "yyyy-MM-dd"),
        p_end: format(endDate, "yyyy-MM-dd")
      });

      if (error) throw error;
      setMetrics(data || []);
    } catch (error) {
      console.error("Failed to load engagement metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const totals = metrics.reduce(
    (acc, m) => ({
      events: acc.events + (m.events_count || 0),
      widgets: acc.widgets + (m.widget_taps || 0),
      tiles: acc.tiles + (m.tile_uses || 0),
      aiPlans: acc.aiPlans + (m.ai_plans || 0),
      aiResolves: acc.aiResolves + (m.ai_resolves || 0),
      aiBriefs: acc.aiBriefs + (m.ai_briefs || 0),
      pageViews: acc.pageViews + (m.page_views || 0)
    }),
    { events: 0, widgets: 0, tiles: 0, aiPlans: 0, aiResolves: 0, aiBriefs: 0, pageViews: 0 }
  );

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <Activity className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Engagement Dashboard</h1>
          <p className="text-muted-foreground">Last 30 days activity metrics</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Events</CardDescription>
            <CardTitle className="text-4xl">{totals.events}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span>All user interactions</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>AI Interactions</CardDescription>
            <CardTitle className="text-4xl">
              {totals.aiPlans + totals.aiResolves + totals.aiBriefs}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plans:</span>
                <span className="font-medium">{totals.aiPlans}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Resolves:</span>
                <span className="font-medium">{totals.aiResolves}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Briefs:</span>
                <span className="font-medium">{totals.aiBriefs}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Widget & Tiles</CardDescription>
            <CardTitle className="text-4xl">
              {totals.widgets + totals.tiles}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Widget taps:</span>
                <span className="font-medium">{totals.widgets}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tile uses:</span>
                <span className="font-medium">{totals.tiles}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Daily Activity
          </CardTitle>
          <CardDescription>
            Events breakdown by day
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {metrics.map(m => (
              <div key={m.day} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="font-medium">{format(new Date(m.day), "MMM dd, yyyy")}</div>
                <div className="flex gap-6 text-sm">
                  <span className="text-muted-foreground">
                    Events: <span className="font-medium text-foreground">{m.events_count}</span>
                  </span>
                  <span className="text-muted-foreground">
                    Features: <span className="font-medium text-foreground">{m.unique_features_used}</span>
                  </span>
                  <span className="text-muted-foreground">
                    Views: <span className="font-medium text-foreground">{m.page_views}</span>
                  </span>
                </div>
              </div>
            ))}

            {metrics.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No activity data yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
