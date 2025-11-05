-- Create table for voice conversations
CREATE TABLE IF NOT EXISTS public.voice_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'محادثة صوتية',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create table for voice messages
CREATE TABLE IF NOT EXISTS public.voice_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.voice_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  audio_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voice_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for voice_conversations
CREATE POLICY "Users can view their own conversations"
  ON public.voice_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations"
  ON public.voice_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
  ON public.voice_conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
  ON public.voice_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for voice_messages
CREATE POLICY "Users can view messages in their conversations"
  ON public.voice_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.voice_conversations
      WHERE id = voice_messages.conversation_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in their conversations"
  ON public.voice_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.voice_conversations
      WHERE id = voice_messages.conversation_id
      AND user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX idx_voice_conversations_user_id ON public.voice_conversations(user_id);
CREATE INDEX idx_voice_messages_conversation_id ON public.voice_messages(conversation_id);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION public.update_voice_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.voice_conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER update_voice_conversation_on_message
  AFTER INSERT ON public.voice_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_voice_conversation_timestamp();