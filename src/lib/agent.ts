import { supabase } from '@/integrations/supabase/client';

export interface AgentResponse {
  ok: boolean;
  reply: string;
  tool_outputs?: any[];
  session_id?: string;
  error?: string;
  details?: string;
}

export interface AgentOptions {
  session_id?: string;
  title?: string;
  location?: { lat: number; lon: number; accuracy?: number };
}

/**
 * Send a message to the AI agent
 * The agent can create/update tasks, events, check conflicts, etc.
 */
export async function askAgent(message: string, opts?: AgentOptions): Promise<AgentResponse> {
  const body: any = { message };
  if (opts?.session_id) body.session_id = opts.session_id;
  if (opts?.title) body.title = opts.title;
  if (opts?.location) body.location = opts.location;

  const { data, error } = await supabase.functions.invoke('agent', {
    body,
  });

  if (error) {
    console.error('Agent error:', error);
    throw error;
  }

  return data as AgentResponse;
}

/**
 * Get all sessions for current user
 */
export async function getSessions() {
  const { data, error } = await supabase
    .from('ai_sessions')
    .select('*')
    .eq('is_archived', false)
    .order('last_activity', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Create a new session
 */
export async function createSession(title: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('ai_sessions')
    .insert([{ title, owner_id: user.id }])
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Archive a session
 */
export async function archiveSession(sessionId: string) {
  const { error } = await supabase
    .from('ai_sessions')
    .update({ is_archived: true })
    .eq('id', sessionId);

  if (error) throw error;
}
