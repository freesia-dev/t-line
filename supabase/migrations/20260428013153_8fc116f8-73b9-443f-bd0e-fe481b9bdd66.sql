-- Create queue history table for daily archives
CREATE TABLE public.queue_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_date DATE NOT NULL UNIQUE,
  cs_total INTEGER NOT NULL DEFAULT 0,
  teller_total INTEGER NOT NULL DEFAULT 0,
  cs_served INTEGER NOT NULL DEFAULT 0,
  teller_served INTEGER NOT NULL DEFAULT 0,
  archived_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast date range queries
CREATE INDEX idx_queue_history_business_date ON public.queue_history(business_date DESC);

-- Enable RLS
ALTER TABLE public.queue_history ENABLE ROW LEVEL SECURITY;

-- Public can read history (no auth in this app)
CREATE POLICY "Allow public read queue_history"
ON public.queue_history
FOR SELECT
USING (true);

-- Public can insert (cron job & client-side fallback)
CREATE POLICY "Allow public insert queue_history"
ON public.queue_history
FOR INSERT
WITH CHECK (true);

-- Public can update (in case of re-archive same day)
CREATE POLICY "Allow public update queue_history"
ON public.queue_history
FOR UPDATE
USING (true);

-- Function to archive current queue_state and reset
CREATE OR REPLACE FUNCTION public.archive_and_reset_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_state RECORD;
  new_business_date DATE;
BEGIN
  -- Get current queue state
  SELECT * INTO current_state FROM public.queue_state LIMIT 1;
  
  IF current_state.id IS NULL THEN
    RETURN;
  END IF;
  
  -- Archive previous business day's data (if there was any activity)
  IF current_state.cs_queue > 0 OR current_state.teller_queue > 0 THEN
    INSERT INTO public.queue_history (
      business_date,
      cs_total,
      teller_total,
      cs_served,
      teller_served
    ) VALUES (
      current_state.last_reset_date,
      current_state.cs_queue,
      current_state.teller_queue,
      current_state.cs_serving,
      current_state.teller_serving
    )
    ON CONFLICT (business_date) DO UPDATE SET
      cs_total = EXCLUDED.cs_total,
      teller_total = EXCLUDED.teller_total,
      cs_served = EXCLUDED.cs_served,
      teller_served = EXCLUDED.teller_served,
      archived_at = now();
  END IF;
  
  -- Compute new business date (WIB, 6 AM boundary)
  new_business_date := (now() AT TIME ZONE 'Asia/Jakarta')::date;
  IF EXTRACT(HOUR FROM (now() AT TIME ZONE 'Asia/Jakarta')) < 6 THEN
    new_business_date := new_business_date - INTERVAL '1 day';
  END IF;
  
  -- Reset queue state
  UPDATE public.queue_state
  SET
    cs_queue = 0,
    teller_queue = 0,
    cs_serving = 0,
    teller_serving = 0,
    cs_status = 'idle',
    teller_status = 'idle',
    last_reset_date = new_business_date,
    last_called_type = NULL,
    last_called_number = NULL,
    last_called_at = NULL
  WHERE id = current_state.id;
END;
$$;

-- Function to auto-cleanup history older than 1 year
CREATE OR REPLACE FUNCTION public.cleanup_old_queue_history()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.queue_history
  WHERE business_date < (CURRENT_DATE - INTERVAL '1 year');
END;
$$;