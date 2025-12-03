-- Safe Database Fix - No Data Loss
-- Run this in your Supabase SQL Editor

-- 1. First, let's see what we have
SELECT 'Current table structures:' as info;

SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'chat_sessions', 'messages')
ORDER BY table_name, ordinal_position;

-- 2. Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'chat_sessions', 'messages');

-- 3. Check existing policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'chat_sessions', 'messages');

-- 4. Enable RLS if not enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view own sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can view messages from own sessions" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages to own sessions" ON public.messages;
DROP POLICY IF EXISTS "Users can update messages in own sessions" ON public.messages;
DROP POLICY IF EXISTS "Users can delete messages from own sessions" ON public.messages;

-- 6. Create RLS policies for users table
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 7. Create RLS policies for chat_sessions table
CREATE POLICY "Users can view own sessions"
  ON public.chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON public.chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.chat_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON public.chat_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- 8. Create RLS policies for messages table
CREATE POLICY "Users can view messages from own sessions"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions 
      WHERE id = messages.session_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages to own sessions"
  ON public.messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_sessions 
      WHERE id = messages.session_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update messages in own sessions"
  ON public.messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions 
      WHERE id = messages.session_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages from own sessions"
  ON public.messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions 
      WHERE id = messages.session_id 
      AND user_id = auth.uid()
    )
  );

-- 9. Create function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create trigger for automatic user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 11. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.users TO anon, authenticated;
GRANT ALL ON public.chat_sessions TO anon, authenticated;
GRANT ALL ON public.messages TO anon, authenticated;

-- 12. Check if sequences exist and grant permissions
DO $$ 
BEGIN
    -- Grant permissions on sequences if they exist
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'chat_sessions_id_seq' AND schemaname = 'public') THEN
        GRANT USAGE ON SEQUENCE public.chat_sessions_id_seq TO anon, authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'messages_id_seq' AND schemaname = 'public') THEN
        GRANT USAGE ON SEQUENCE public.messages_id_seq TO anon, authenticated;
    END IF;
END $$;

-- Success message
SELECT 'Database policies and permissions fixed successfully!' as status;
