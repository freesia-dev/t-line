-- Add status columns for CS and Teller
ALTER TABLE public.queue_state 
ADD COLUMN cs_status text NOT NULL DEFAULT 'idle',
ADD COLUMN teller_status text NOT NULL DEFAULT 'idle';

-- Status values: 'idle', 'serving', 'calling', 'repeat', 'break'

COMMENT ON COLUMN public.queue_state.cs_status IS 'Status: idle, serving, calling, repeat, break';
COMMENT ON COLUMN public.queue_state.teller_status IS 'Status: idle, serving, calling, repeat, break';