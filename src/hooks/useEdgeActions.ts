import { useCallback } from "react";
import {
  edgeCall,
  type ConflictReq,
  type ConflictRes,
  type PlanReq,
  type PlanRes,
  type LocUpdateReq,
  type LocUpdateRes,
} from "@/lib/edgeClient";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

async function getJWT() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("no_auth");
  return session.access_token;
}

const opts = async () => ({
  jwt: await getJWT(),
  telemetry: true,
  guardrails: true,
});

export function useEdgeActions() {
  const fetchConflicts = useCallback(async (dateISO: string) => {
    try {
      const res = await edgeCall<ConflictReq, ConflictRes>(
        "conflict-check",
        { date: dateISO },
        await opts()
      );
      return res;
    } catch (error: any) {
      toast({
        title: "خطأ في جلب التعارضات",
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
      throw error;
    }
  }, []);

  const planMyDay = useCallback(
    async (
      window: { start: string; end: string },
      preferences?: any,
      constraints?: any
    ) => {
      try {
        const payload: PlanReq = {
          intent: "plan_my_day",
          preferences,
          constraints,
          calendar_window: window,
        };
        const res = await edgeCall<PlanReq, PlanRes>(
          "ai-orchestrator",
          payload,
          await opts()
        );
        toast({
          title: "تم التخطيط",
          description: "تم إنشاء الخطة بنجاح",
        });
        return res;
      } catch (error: any) {
        toast({
          title: "خطأ في التخطيط",
          description: error.message || "حدث خطأ غير متوقع",
          variant: "destructive",
        });
        throw error;
      }
    },
    []
  );

  const resolveConflict = useCallback(async (input: any) => {
    try {
      const payload: PlanReq = {
        intent: "resolve_conflicts",
        calendar_window: { start: "today 00:00", end: "today 23:59" },
        input,
      };
      const res = await edgeCall<PlanReq, PlanRes>(
        "ai-orchestrator",
        payload,
        await opts()
      );
      toast({
        title: "تم التطبيق",
        description: "تم تنفيذ القرار بنجاح",
      });
      return res;
    } catch (error: any) {
      toast({
        title: "خطأ في حل التعارض",
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
      throw error;
    }
  }, []);

  const sendLocation = useCallback(async (loc: LocUpdateReq) => {
    try {
      const res = await edgeCall<LocUpdateReq, LocUpdateRes>(
        "location-update",
        loc,
        await opts()
      );
      return res;
    } catch (error: any) {
      console.warn("Location update failed:", error);
      throw error;
    }
  }, []);

  return { fetchConflicts, planMyDay, resolveConflict, sendLocation };
}
