import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, AlertTriangle, Zap, Brain, WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/ui/empty-state';
import { useAIInsights } from '@/hooks/useAIInsights';

interface AIInsightsCardProps {
  date?: string;
}

const energyConfig = {
  low: { color: 'text-red-500', bg: 'bg-red-500/10', icon: '🔴' },
  medium: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: '🟡' },
  high: { color: 'text-green-500', bg: 'bg-green-500/10', icon: '🟢' },
};

export function AIInsightsCard({ date }: AIInsightsCardProps) {
  const { t } = useTranslation();
  const { insights, loading } = useAIInsights(date);

  if (loading) {
    return (
      <Card className="p-4 md:p-6 bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/20">
        <div className="flex items-center gap-2 mb-3 md:mb-4">
          <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-violet-500 animate-pulse" />
          <h3 className="text-base md:text-lg font-bold">{t('today.aiInsights.title')}</h3>
        </div>
        <div className="space-y-2 md:space-y-3">
          <div className="h-3 md:h-4 bg-muted/30 rounded animate-pulse" />
          <div className="h-3 md:h-4 bg-muted/30 rounded animate-pulse w-3/4" />
        </div>
      </Card>
    );
  }

  if (!insights) {
    return (
      <EmptyState
        icon={Brain}
        title={t('today.aiInsights.empty.title')}
        description={t('today.aiInsights.empty.description')}
        size="md"
      />
    );
  }

  const energy = energyConfig[insights.energyLevel];
  const hasSuggestions = insights.suggestions?.length > 0;
  const hasWarnings = insights.warnings?.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <Card className="p-4 md:p-6 bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/20 relative overflow-hidden">
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

        <div className="relative space-y-3 md:space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 md:gap-2">
              <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-violet-500" />
              <h3 className="text-base md:text-lg font-bold">{t('today.aiInsights.title')}</h3>
            </div>
            <div className="flex items-center gap-1 md:gap-2">
              <Badge variant="secondary" className="gap-0.5 md:gap-1 px-1.5 md:px-2">
                <Zap className="w-2.5 h-2.5 md:w-3 md:h-3" />
                <span className="text-[10px] md:text-xs">{insights.model_version || 'v1.0'}</span>
              </Badge>
            </div>
          </div>

          {/* Focus Score */}
          <div className="space-y-1.5 md:space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs md:text-sm text-muted-foreground">{t('today.aiInsights.focusLevel')}</span>
              <span className="text-lg md:text-2xl font-bold text-foreground">{insights.focusScore}%</span>
            </div>
            <Progress value={insights.focusScore} className="h-1.5 md:h-2" />
          </div>

          {/* Energy Level */}
          <div className={`flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg ${energy.bg}`}>
            <span className="text-lg md:text-2xl">{energy.icon}</span>
            <div>
              <p className="text-[10px] md:text-xs text-muted-foreground">{t('today.aiInsights.energyLevel')}</p>
              <p className={`text-xs md:text-sm font-bold ${energy.color}`}>{t(`today.aiInsights.energy.${insights.energyLevel}`)}</p>
            </div>
          </div>

          {/* Suggestions */}
          {hasSuggestions && (
            <div className="space-y-1.5 md:space-y-2">
              <div className="flex items-center gap-1.5 md:gap-2">
                <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-green-500" />
                <p className="text-xs md:text-sm font-medium">{t('today.aiInsights.suggestions')}</p>
              </div>
              <div className="space-y-1.5 md:space-y-2">
                {insights.suggestions.map((suggestion, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-1.5 md:gap-2 p-1.5 md:p-2 rounded-lg bg-background/50 backdrop-blur-sm"
                  >
                    <span className="text-green-500 mt-0.5 text-xs md:text-sm">•</span>
                    <p className="text-[11px] md:text-sm text-foreground flex-1 leading-relaxed">{suggestion}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {hasWarnings && (
            <div className="space-y-1.5 md:space-y-2">
              <div className="flex items-center gap-1.5 md:gap-2">
                <AlertTriangle className="w-3 h-3 md:w-4 md:h-4 text-amber-500" />
                <p className="text-xs md:text-sm font-medium">{t('today.aiInsights.warnings')}</p>
              </div>
              <div className="space-y-1.5 md:space-y-2">
                {insights.warnings.map((warning, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-1.5 md:gap-2 p-1.5 md:p-2 rounded-lg bg-amber-500/10 backdrop-blur-sm"
                  >
                    <span className="mt-0.5 text-xs md:text-sm">⚠️</span>
                    <p className="text-[11px] md:text-sm text-foreground flex-1 leading-relaxed">{warning}</p>
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
