import { supabase } from '@/integrations/supabase/client';

export interface AgentResponse {
  ok: boolean;
  reply: string;
  tool_outputs?: any[];
  error?: string;
  details?: string;
}

/**
 * Send a message to the AI agent
 * The agent can create/update tasks, events, check conflicts, etc.
 */
export async function askAgent(message: string): Promise<AgentResponse> {
  const { data, error } = await supabase.functions.invoke('agent', {
    body: { message },
  });

  if (error) {
    console.error('Agent error:', error);
    throw error;
  }

  return data as AgentResponse;
}
