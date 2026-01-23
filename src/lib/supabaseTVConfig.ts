import { supabase } from '@/integrations/supabase/client';
import { TVDisplayConfig, SlideshowAnimation } from './queueStore';

interface TVConfigRow {
  id: string;
  layout: string;
  show_media: boolean;
  media_type: string;
  media_url: string | null;
  media_mode: string;
  slideshow_images: string[];
  slideshow_interval: number;
  slideshow_animation: string;
  show_running_text: boolean;
  running_text: string | null;
  running_text_speed: string;
  running_text_color: string;
  running_text_bg_color: string;
  created_at: string;
  updated_at: string;
}

const DEFAULT_TV_CONFIG: TVDisplayConfig = {
  layout: 'layout1',
  showMedia: true,
  mediaType: 'image',
  mediaUrl: '',
  mediaMode: 'single',
  slideshowImages: [],
  slideshowInterval: 5,
  slideshowAnimation: 'fade',
  showRunningText: true,
  runningText: 'Suku Bunga Deposito: 1 Bulan 3.25% | 3 Bulan 3.50% | 6 Bulan 3.75% | 12 Bulan 4.00% | Tabungan Simpeda 1.00% | Giro 0.50%',
  runningTextSpeed: 'medium',
  runningTextColor: '#ffffff',
  runningTextBgColor: '#f59e0b',
};

// Convert database row to TVDisplayConfig
const rowToConfig = (row: TVConfigRow): TVDisplayConfig => ({
  layout: row.layout as TVDisplayConfig['layout'],
  showMedia: row.show_media,
  mediaType: row.media_type as 'image' | 'video',
  mediaUrl: row.media_url || '',
  mediaMode: row.media_mode as 'single' | 'slideshow' | 'video',
  slideshowImages: row.slideshow_images || [],
  slideshowInterval: row.slideshow_interval,
  slideshowAnimation: row.slideshow_animation as SlideshowAnimation,
  showRunningText: row.show_running_text,
  runningText: row.running_text || '',
  runningTextSpeed: row.running_text_speed as 'slow' | 'medium' | 'fast',
  runningTextColor: row.running_text_color,
  runningTextBgColor: row.running_text_bg_color,
});

// Convert TVDisplayConfig to database row format
const configToRow = (config: TVDisplayConfig) => ({
  layout: config.layout,
  show_media: config.showMedia,
  media_type: config.mediaType,
  media_url: config.mediaUrl,
  media_mode: config.mediaMode,
  slideshow_images: config.slideshowImages,
  slideshow_interval: config.slideshowInterval,
  slideshow_animation: config.slideshowAnimation,
  show_running_text: config.showRunningText,
  running_text: config.runningText,
  running_text_speed: config.runningTextSpeed,
  running_text_color: config.runningTextColor,
  running_text_bg_color: config.runningTextBgColor,
  updated_at: new Date().toISOString(),
});

// Fetch TV display config from Supabase
export const fetchTVDisplayConfig = async (): Promise<TVDisplayConfig> => {
  try {
    const { data, error } = await supabase
      .from('tv_display_config')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    if (error) {
      console.error('Error fetching TV config:', error);
      return DEFAULT_TV_CONFIG;
    }

    if (!data) {
      // Create default config if not exists
      await saveTVDisplayConfigToSupabase(DEFAULT_TV_CONFIG);
      return DEFAULT_TV_CONFIG;
    }

    return rowToConfig(data as unknown as TVConfigRow);
  } catch (err) {
    console.error('Error in fetchTVDisplayConfig:', err);
    return DEFAULT_TV_CONFIG;
  }
};

// Save TV display config to Supabase
export const saveTVDisplayConfigToSupabase = async (config: TVDisplayConfig): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('tv_display_config')
      .upsert({
        id: 'default',
        ...configToRow(config),
      });

    if (error) {
      console.error('Error saving TV config:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error in saveTVDisplayConfigToSupabase:', err);
    return false;
  }
};

// Subscribe to TV display config changes (realtime)
export const subscribeToTVDisplayConfig = (
  callback: (config: TVDisplayConfig) => void
): (() => void) => {
  const channel = supabase
    .channel('tv_display_config_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tv_display_config',
        filter: 'id=eq.default',
      },
      (payload) => {
        console.log('[TVConfig] Realtime update received:', payload);
        if (payload.new) {
          const config = rowToConfig(payload.new as unknown as TVConfigRow);
          callback(config);
        }
      }
    )
    .subscribe((status) => {
      console.log('[TVConfig] Subscription status:', status);
    });

  return () => {
    supabase.removeChannel(channel);
  };
};
