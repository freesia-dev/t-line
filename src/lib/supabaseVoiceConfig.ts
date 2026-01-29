import { supabase } from '@/integrations/supabase/client';
import { VoiceConfig, PronunciationMapping, CustomAudioPhrase } from './queueStore';
import type { Json } from '@/integrations/supabase/types';

const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  voiceName: '',
  speed: 'normal',
  pronunciations: [
    { original: 'Customer Service', spoken: 'Kastamer Servis' },
    { original: 'Teller', spoken: 'Teler' },
  ],
  useCustomAudio: false,
  customAudioPhrases: [
    { phrase: 'nomor_antrian', label: 'Nomor Antrian', audioUrl: '' },
    { phrase: 'customer_service', label: 'Customer Service', audioUrl: '' },
    { phrase: 'teller', label: 'Teller', audioUrl: '' },
    { phrase: 'silakan_menuju', label: 'Silakan Menuju ke', audioUrl: '' },
  ],
};

interface VoiceConfigRow {
  id: string;
  voice_name: string;
  speed: string;
  pronunciations: Json;
  use_custom_audio: boolean;
  custom_audio_phrases: Json;
  created_at: string;
  updated_at: string;
}

const rowToConfig = (row: VoiceConfigRow): VoiceConfig => ({
  voiceName: row.voice_name,
  speed: row.speed as 'slow' | 'normal' | 'fast',
  pronunciations: (row.pronunciations as unknown as PronunciationMapping[]) || DEFAULT_VOICE_CONFIG.pronunciations,
  useCustomAudio: row.use_custom_audio,
  customAudioPhrases: (row.custom_audio_phrases as unknown as CustomAudioPhrase[]) || DEFAULT_VOICE_CONFIG.customAudioPhrases,
});

const configToRow = (config: VoiceConfig) => ({
  voice_name: config.voiceName,
  speed: config.speed,
  pronunciations: config.pronunciations as unknown as Json,
  use_custom_audio: config.useCustomAudio,
  custom_audio_phrases: config.customAudioPhrases as unknown as Json,
  updated_at: new Date().toISOString(),
});

export const fetchVoiceConfig = async (): Promise<VoiceConfig> => {
  const { data, error } = await supabase
    .from('voice_config')
    .select('*')
    .eq('id', 'default')
    .maybeSingle();

  if (error) {
    console.error('Error fetching voice config:', error);
    return DEFAULT_VOICE_CONFIG;
  }

  if (!data) {
    // Insert default config if not exists
    const insertData = {
      id: 'default',
      ...configToRow(DEFAULT_VOICE_CONFIG),
    };
    
    const { data: inserted, error: insertError } = await supabase
      .from('voice_config')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting default voice config:', insertError);
      return DEFAULT_VOICE_CONFIG;
    }

    return rowToConfig(inserted as VoiceConfigRow);
  }

  return rowToConfig(data as VoiceConfigRow);
};

export const saveVoiceConfigToSupabase = async (config: VoiceConfig): Promise<boolean> => {
  const { error } = await supabase
    .from('voice_config')
    .update(configToRow(config))
    .eq('id', 'default');

  if (error) {
    console.error('Error saving voice config:', error);
    return false;
  }

  return true;
};

export const subscribeToVoiceConfig = (
  callback: (config: VoiceConfig) => void
): (() => void) => {
  const channel = supabase
    .channel('voice_config_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'voice_config',
        filter: 'id=eq.default',
      },
      (payload) => {
        console.log('Voice config changed:', payload);
        if (payload.new) {
          callback(rowToConfig(payload.new as VoiceConfigRow));
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

export { DEFAULT_VOICE_CONFIG };
