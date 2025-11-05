import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, AlertTriangle, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface AIInsightsCardProps {
  insights: {
    focusScore: number;
    energyLevel: 'low' | 'medium' | 'high';
    suggestions: string[];
    warnings: string[];
  } | null;
  loading?: boolean;
}

const energyConfig = {
  low: { color: 'text-red-500', bg: 'bg-red-500/10', label: 'منخفضة', icon: '🔴' },
  medium: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'متوسطة', icon: '🟡' },
  high: { color: 'text-green-500', bg: 'bg-green-500/10', label: 'عالية', icon: '🟢' },
};

export function AIInsightsCard({ insights, loading }: AIInsightsCardProps) {
  if (loading) {
    return (
      <Card className="p-6 bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/20">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-violet-500 animate-pulse" />
          <h3 className="text-lg font-bold">رؤى الذكاء الاصطناعي</h3>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-muted/30 rounded animate-pulse" />
          <div className="h-4 bg-muted/30 rounded animate-pulse w-3/4" />
        </div>
      </Card>
    );
  }

  if (!insights) return null;

  const energy = energyConfig[insights.energyLevel];
  const hasSuggestions = insights.suggestions?.length > 0;
  const hasWarnings = insights.warnings?.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <Card className="p-6 bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/20 relative overflow-hidden">
        {/* Animated background gradient */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-purple-500/5"
          animate={{
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        <div className="relative space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-500" />
              <h3 className="text-lg font-bold">رؤى الذكاء الاصطناعي</h3>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Zap className="w-3 h-3" />
              مباشر
            </Badge>
          </div>

          {/* Focus Score */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">مستوى التركيز</span>
              <span className="text-2xl font-bold text-foreground">{insights.focusScore}%</span>
            </div>
            <Progress value={insights.focusScore} className="h-2" />
          </div>

          {/* Energy Level */}
          <div className={`flex items-center gap-3 p-3 rounded-lg ${energy.bg}`}>
            <span className="text-2xl">{energy.icon}</span>
            <div>
              <p className="text-xs text-muted-foreground">مستوى الطاقة</p>
              <p className={`font-bold ${energy.color}`}>{energy.label}</p>
            </div>
          </div>

          {/* Suggestions */}
          {hasSuggestions && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <p className="text-sm font-medium">اقتراحات</p>
              </div>
              <div className="space-y-2">
                {insights.suggestions.map((suggestion, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-2 p-2 rounded-lg bg-background/50 backdrop-blur-sm"
                  >
                    <span className="text-green-500 mt-0.5">•</span>
                    <p className="text-sm text-foreground flex-1">{suggestion}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {hasWarnings && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <p className="text-sm font-medium">تحذيرات</p>
              </div>
              <div className="space-y-2">
                {insights.warnings.map((warning, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 backdrop-blur-sm"
                  >
                    <span className="text-amber-500 mt-0.5">⚠️</span>
                    <p className="text-sm text-foreground flex-1">{warning}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
