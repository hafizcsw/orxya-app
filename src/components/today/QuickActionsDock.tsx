import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Calendar, DollarSign, CheckSquare, X, Activity, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useAI } from "@/contexts/AIContext";

export function QuickActionsDock() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { setIsAIOpen, setChatType } = useAI();

  const actions = [
    { 
      icon: Sparkles, 
      label: "AI Insights", 
      color: "bg-violet-500/10 text-violet-500 hover:bg-violet-500/20",
      onClick: () => {
        setChatType('insights');
        setIsAIOpen(true);
      }
    },
    { 
      icon: Calendar, 
      label: "إضافة حدث", 
      color: "bg-primary/10 text-primary hover:bg-primary/20",
      onClick: () => navigate("/calendar")
    },
    { 
      icon: DollarSign, 
      label: "معاملة مالية", 
      color: "bg-success/10 text-success hover:bg-success/20",
      onClick: () => navigate("/expenses")
    },
    { 
      icon: CheckSquare, 
      label: "مهمة سريعة", 
      color: "bg-accent/10 text-accent-foreground hover:bg-accent/20",
      onClick: () => navigate("/inbox")
    },
    { 
      icon: Activity, 
      label: "بيانات WHOOP", 
      color: "bg-destructive/10 text-destructive hover:bg-destructive/20",
      onClick: () => navigate("/today-whoop")
    },
  ];

  return (
    <div className="fixed bottom-24 left-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="absolute bottom-16 left-0 space-y-3 mb-2"
          >
            {actions.map((action, index) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => {
                  action.onClick();
                  setIsOpen(false);
                }}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-full shadow-lg backdrop-blur-sm",
                  "transition-all duration-200 hover:scale-105",
                  action.color
                )}
              >
                <action.icon className="w-5 h-5" />
                <span className="text-sm font-medium whitespace-nowrap">{action.label}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-full shadow-xl",
          "flex items-center justify-center",
          "transition-all duration-300",
          isOpen 
            ? "bg-destructive text-destructive-foreground rotate-45" 
            : "bg-primary text-primary-foreground"
        )}
        style={{
          boxShadow: isOpen 
            ? "0 0 30px hsl(var(--destructive) / 0.4)" 
            : "0 0 30px hsl(var(--primary) / 0.4)",
        }}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
      </motion.button>
    </div>
  );
}
