-- Add missing columns to conversations table for storing ElevenLabs analysis and flashcards
ALTER TABLE public.conversations 
ADD COLUMN analysis TEXT,
ADD COLUMN flashcards JSONB DEFAULT '[]'::jsonb;