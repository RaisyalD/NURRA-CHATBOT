-- Quick Fix for Sequence Issue
-- Run this in your Supabase SQL Editor

-- 1. Check if sequences exist and create them if needed
DO $$ 
BEGIN
    -- Check if chat_sessions_id_seq exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_sequences 
        WHERE sequencename = 'chat_sessions_id_seq' 
        AND schemaname = 'public'
    ) THEN
        -- Create sequence for chat_sessions
        CREATE SEQUENCE public.chat_sessions_id_seq;
    END IF;
    
    -- Check if messages_id_seq exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_sequences 
        WHERE sequencename = 'messages_id_seq' 
        AND schemaname = 'public'
    ) THEN
        -- Create sequence for messages
        CREATE SEQUENCE public.messages_id_seq;
    END IF;
END $$;

-- 2. Grant permissions on sequences
GRANT USAGE ON SEQUENCE public.chat_sessions_id_seq TO anon, authenticated;
GRANT USAGE ON SEQUENCE public.messages_id_seq TO anon, authenticated;

-- 3. Alternative: If the above doesn't work, let's recreate the tables properly
-- This is a safer approach that won't lose data

-- First, let's check the current structure
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

-- Success message
SELECT 'Sequence fix completed! Check the table structure above.' as status;
