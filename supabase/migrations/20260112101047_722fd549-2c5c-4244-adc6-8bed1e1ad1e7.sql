-- Create queue_state table for real-time sync across devices
CREATE TABLE public.queue_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cs_queue INTEGER NOT NULL DEFAULT 0,
  teller_queue INTEGER NOT NULL DEFAULT 0,
  cs_serving INTEGER NOT NULL DEFAULT 0,
  teller_serving INTEGER NOT NULL DEFAULT 0,
  last_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  last_called_type TEXT,
  last_called_number INTEGER,
  last_called_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.queue_state ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for queue system (no auth needed for kiosk)
CREATE POLICY "Allow public read queue_state" 
ON public.queue_state 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert queue_state" 
ON public.queue_state 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update queue_state" 
ON public.queue_state 
FOR UPDATE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE OR REPLACE FUNCTION public.update_queue_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_queue_state_updated_at
BEFORE UPDATE ON public.queue_state
FOR EACH ROW
EXECUTE FUNCTION public.update_queue_state_updated_at();

-- Insert initial state
INSERT INTO public.queue_state (cs_queue, teller_queue, cs_serving, teller_serving)
VALUES (0, 0, 0, 0);

-- Enable realtime for queue_state table
ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_state;