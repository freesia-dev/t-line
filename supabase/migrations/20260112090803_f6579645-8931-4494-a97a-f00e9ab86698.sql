-- Create storage bucket for media files
INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', true);

-- Allow anyone to view media files (public bucket)
CREATE POLICY "Public can view media files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'media');

-- Allow anyone to upload media files (no auth required for this app)
CREATE POLICY "Anyone can upload media files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'media');

-- Allow anyone to delete media files (no auth required for this app)
CREATE POLICY "Anyone can delete media files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'media');

-- Create table to track uploaded media
CREATE TABLE public.media_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS but allow public access (no auth for this app)
ALTER TABLE public.media_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view media files" 
ON public.media_files 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert media files" 
ON public.media_files 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can delete media files" 
ON public.media_files 
FOR DELETE 
USING (true);