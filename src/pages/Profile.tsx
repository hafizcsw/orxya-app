import { useUser } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export default function Profile() {
  const { user } = useUser();
  
  if (!user) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center text-muted-foreground">
          غير مسجّل. افتح الدخول من الأعلى.
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <div className="max-w-md mx-auto space-y-4 bg-card rounded-xl p-6 shadow-sm">
        <h1 className="text-2xl font-bold">حسابي</h1>
        
        <div className="space-y-2">
          <div>
            <span className="text-sm text-muted-foreground">المعرّف:</span>
            <div className="font-mono text-xs break-all mt-1">{user.id}</div>
          </div>
          
          <div>
            <span className="text-sm text-muted-foreground">البريد:</span>
            <div className="mt-1">{user.email}</div>
          </div>
        </div>
        
        <button 
          className="w-full px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors" 
          onClick={() => supabase.auth.signOut()}
        >
          خروج
        </button>
      </div>
    </div>
  );
}
