-- Create table for TV display configuration (synced across devices)
CREATE TABLE public.tv_display_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  layout TEXT NOT NULL DEFAULT 'layout1',
  show_media BOOLEAN NOT NULL DEFAULT true,
  media_type TEXT NOT NULL DEFAULT 'image',
  media_url TEXT DEFAULT '',
  media_mode TEXT NOT NULL DEFAULT 'single',
  slideshow_images JSONB DEFAULT '[]'::jsonb,
  slideshow_interval INTEGER NOT NULL DEFAULT 5,
  slideshow_animation TEXT NOT NULL DEFAULT 'fade',
  show_running_text BOOLEAN NOT NULL DEFAULT true,
  running_text TEXT DEFAULT 'Suku Bunga Deposito: 1 Bulan 3.25% | 3 Bulan 3.50% | 6 Bulan 3.75% | 12 Bulan 4.00%',
  running_text_speed TEXT NOT NULL DEFAULT 'medium',
  running_text_color TEXT NOT NULL DEFAULT '#ffffff',
  running_text_bg_color TEXT NOT NULL DEFAULT '#f59e0b',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tv_display_config ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read and write (public kiosk system)
CREATE POLICY "Allow public read access" 
ON public.tv_display_config 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public write access" 
ON public.tv_display_config 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access" 
ON public.tv_display_config 
FOR UPDATE 
USING (true);

-- Insert default config
INSERT INTO public.tv_display_config (id) VALUES ('default');

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.tv_display_config;