-- Fix Existing Database Schema for Islamic AI Assistant
-- Run this in your Supabase SQL Editor to fix existing tables

-- 1. First, let's check what we have and fix the issues

-- Drop existing policies if they exist (to avoid conflicts)
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

-- 2. Fix the users table structure
-- Add missing columns if they don't exist
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS id UUID,
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS full_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- If the users table doesn't have the right structure, let's recreate it
-- First, backup existing data if any
CREATE TABLE IF NOT EXISTS public.users_backup AS 
SELECT * FROM public.users WHERE 1=0;

-- Insert existing data into backup if users table has data
INSERT INTO public.users_backup 
SELECT * FROM public.users 
WHERE EXISTS (SELECT 1 FROM public.users LIMIT 1);

-- Drop and recreate users table with proper structure
DROP TABLE IF EXISTS public.users CASCADE;

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Fix the chat_sessions table structure
-- Check if it has the right columns
ALTER TABLE public.chat_sessions 
ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS title VARCHAR(255) DEFAULT 'New Chat',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Set primary key if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'chat_sessions_pkey' 
        AND table_name = 'chat_sessions'
    ) THEN
        ALTER TABLE public.chat_sessions ADD PRIMARY KEY (id);
    END IF;
END $$;

-- Add foreign key constraint if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'chat_sessions_user_id_fkey' 
        AND table_name = 'chat_sessions'
    ) THEN
        ALTER TABLE public.chat_sessions 
        ADD CONSTRAINT chat_sessions_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Fix the messages table structure
-- Check if it has the right columns
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS session_id UUID,
ADD COLUMN IF NOT EXISTS role VARCHAR(20),
ADD COLUMN IF NOT EXISTS content TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Set primary key if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'messages_pkey' 
        AND table_name = 'messages'
    ) THEN
        ALTER TABLE public.messages ADD PRIMARY KEY (id);
    END IF;
END $$;

-- Add foreign key constraint if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'messages_session_id_fkey' 
        AND table_name = 'messages'
    ) THEN
        ALTER TABLE public.messages 
        ADD CONSTRAINT messages_session_id_fkey 
        FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add check constraint for role if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'messages_role_check' 
    ) THEN
        ALTER TABLE public.messages 
        ADD CONSTRAINT messages_role_check CHECK (role IN ('user', 'assistant'));
    END IF;
END $$;

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON public.messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for users table
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 8. Create RLS policies for chat_sessions table
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

-- 9. Create RLS policies for messages table
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

-- 10. Create function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create trigger for automatic user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 12. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.users TO anon, authenticated;
GRANT ALL ON public.chat_sessions TO anon, authenticated;
GRANT ALL ON public.messages TO anon, authenticated;

-- Success message
SELECT 'Database schema fixed successfully!' as status;
