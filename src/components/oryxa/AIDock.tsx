import { useState } from "react";
import { X, Send } from "lucide-react";
import { cn } from "@/lib/utils";

export function AIDock() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (message.trim()) {
      console.log("AI Message:", message);
      setMessage("");
    }
  };

  return (
    <>
      {/* Fixed W Icon - WHOOP Style */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed top-6 right-6 z-50",
          "w-12 h-12 rounded-full",
          "bg-[hsl(var(--whoop-blue))] text-white",
          "flex items-center justify-center",
          "font-bold text-2xl tracking-tight",
          "shadow-lg hover:scale-105 transition-transform",
          "border-2 border-[hsl(var(--whoop-blue)_/_0.3)]"
        )}
        style={{
          boxShadow: "var(--glow-blue)",
        }}
      >
        W
      </button>

      {/* AI Chat Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-end p-6">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          
          <div className="relative w-full max-w-md h-[600px] bg-card rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-full bg-[hsl(var(--whoop-blue))] flex items-center justify-center font-bold text-xl text-white"
                  style={{ boxShadow: "var(--glow-blue)" }}
                >
                  W
                </div>
                <div>
                  <h3 className="font-semibold">WHOOP Coach</h3>
                  <p className="text-xs text-muted-foreground">AI Assistant</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="bg-secondary/50 rounded-2xl p-4 max-w-[80%]">
                <p className="text-sm">مرحباً! أنا مساعدك الذكي. كيف يمكنني مساعدتك اليوم؟</p>
              </div>
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="اكتب رسالتك..."
                  className="flex-1 bg-secondary rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={handleSend}
                  disabled={!message.trim()}
                  className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
