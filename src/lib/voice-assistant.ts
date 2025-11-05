import { supabase } from '@/integrations/supabase/client';

export interface VoiceMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  audio_url?: string;
  created_at: string;
}

export interface VoiceConversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get or create active conversation
 */
export async function getOrCreateConversation(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Try to get the most recent conversation
  const { data: existing } = await supabase
    .from('voice_conversations')
    .select('id')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (existing) return existing.id;

  // Create new conversation
  const { data: newConv, error } = await supabase
    .from('voice_conversations')
    .insert([{ user_id: user.id }])
    .select('id')
    .single();

  if (error) throw error;
  return newConv.id;
}

/**
 * Get conversation history
 */
export async function getConversationHistory(conversationId: string): Promise<VoiceMessage[]> {
  const { data, error } = await supabase
    .from('voice_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  
  return (data || []).map(msg => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
    audio_url: msg.audio_url || undefined,
    created_at: msg.created_at,
  }));
}

/**
 * Save message to conversation
 */
export async function saveMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
  audioUrl?: string
): Promise<void> {
  const { error } = await supabase
    .from('voice_messages')
    .insert([{
      conversation_id: conversationId,
      role,
      content,
      audio_url: audioUrl,
    }]);

  if (error) throw error;
}

/**
 * Create new conversation
 */
export async function createNewConversation(title?: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('voice_conversations')
    .insert([{ 
      user_id: user.id,
      title: title || 'محادثة صوتية'
    }])
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

/**
 * Get all conversations
 */
export async function getAllConversations(): Promise<VoiceConversation[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('voice_conversations')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Delete conversation
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  const { error } = await supabase
    .from('voice_conversations')
    .delete()
    .eq('id', conversationId);

  if (error) throw error;
}
