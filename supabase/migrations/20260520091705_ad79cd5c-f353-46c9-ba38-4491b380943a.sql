ALTER TABLE public.tv_display_config
  ADD COLUMN IF NOT EXISTS info_panel_type text NOT NULL DEFAULT 'media',
  ADD COLUMN IF NOT EXISTS info_panel_rotate_interval integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS product_rates jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS deposit_rates jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS exchange_rates jsonb NOT NULL DEFAULT '[]'::jsonb;