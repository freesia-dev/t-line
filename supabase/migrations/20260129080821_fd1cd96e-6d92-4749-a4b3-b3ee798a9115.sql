-- Create voice_config table for storing voice settings
CREATE TABLE public.voice_config (
  id text NOT NULL DEFAULT 'default' PRIMARY KEY,
  voice_name text NOT NULL DEFAULT '',
  speed text NOT NULL DEFAULT 'normal',
  pronunciations jsonb NOT NULL DEFAULT '[]'::jsonb,
  use_custom_audio boolean NOT NULL DEFAULT false,
  custom_audio_phrases jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voice_config ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow public read voice_config" 
ON public.voice_config 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public update voice_config" 
ON public.voice_config 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public insert voice_config" 
ON public.voice_config 
FOR INSERT 
WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_config;

-- Insert default config
INSERT INTO public.voice_config (id, voice_name, speed, pronunciations, use_custom_audio, custom_audio_phrases)
VALUES (
  'default',
  '',
  'normal',
  '[{"original": "Customer Service", "spoken": "Kastamer Servis"}, {"original": "Teller", "spoken": "Teler"}]'::jsonb,
  false,
  '[{"phrase": "nomor_antrian", "label": "Nomor Antrian", "audioUrl": ""}, {"phrase": "customer_service", "label": "Customer Service", "audioUrl": ""}, {"phrase": "teller", "label": "Teller", "audioUrl": ""}, {"phrase": "silakan_menuju", "label": "Silakan Menuju ke", "audioUrl": ""}]'::jsonb
);