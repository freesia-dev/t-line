// Audio utilities for queue system with Indonesian TTS
// OPTIMIZED: Pre-load voices and reduce delays for faster announcements

import { getVoiceConfig, CustomAudioPhrase } from './queueStore';

// Cache for pre-loaded audio and voices
let voicesLoaded = false;
let cachedVoices: SpeechSynthesisVoice[] = [];
let dingSoundBuffer: AudioBuffer | null = null;
let audioContext: AudioContext | null = null;

// Prime/initialize the SAME AudioContext used by announcements.
// IMPORTANT: Must be called from a user gesture in kiosk mode to satisfy autoplay policies.
export const primeAnnouncementAudio = async (): Promise<void> => {
  try {
    const ctx = await initAudioContext();
    if (ctx && ctx.state === 'suspended') {
      await ctx.resume();
    }
  } catch (e) {
    console.warn('[Audio] primeAnnouncementAudio failed:', e);
  }
};

// Pre-load voices immediately when module loads
const preloadVoices = () => {
  if ('speechSynthesis' in window) {
    const loadVoices = () => {
      cachedVoices = window.speechSynthesis.getVoices();
      if (cachedVoices.length > 0) {
        voicesLoaded = true;
        console.log('[Audio] Voices pre-loaded:', cachedVoices.length);
      }
    };
    
    // Try immediately
    loadVoices();
    
    // Also listen for voiceschanged event (Chrome needs this)
    if (!voicesLoaded) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }
};

// Initialize audio context and pre-generate ding sound buffer
const initAudioContext = async () => {
  if (audioContext) return audioContext;
  
  try {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Pre-generate ding sound buffer for instant playback
    const sampleRate = audioContext.sampleRate;
    const duration = 0.8;
    const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    
    // Generate bell-like tone
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 5);
      data[i] = Math.sin(2 * Math.PI * 830 * t) * envelope * 0.5;
    }
    
    dingSoundBuffer = buffer;
    console.log('[Audio] Audio context and ding buffer initialized');
    
    return audioContext;
  } catch (error) {
    console.error('[Audio] Failed to init audio context:', error);
    return null;
  }
};

// Initialize on module load
if (typeof window !== 'undefined') {
  preloadVoices();
  // Defer audio context init until first interaction (browser policy)
}

// Play a custom audio file and return a promise - OPTIMIZED
const playCustomAudio = (url: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    audio.preload = 'auto';
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error('Failed to play audio'));
    audio.play().catch(reject);
  });
};

// Convert digit to Indonesian word
const digitToIndonesian = (digit: string): string => {
  const digitMap: Record<string, string> = {
    '0': 'nol',
    '1': 'satu',
    '2': 'dua',
    '3': 'tiga',
    '4': 'empat',
    '5': 'lima',
    '6': 'enam',
    '7': 'tujuh',
    '8': 'delapan',
    '9': 'sembilan',
  };
  return digitMap[digit] || digit;
};

// Convert two-digit number to Indonesian word (proper pronunciation)
const twoDigitToIndonesian = (num: number): string => {
  if (num === 0) return 'nol';
  if (num < 10) return digitToIndonesian(String(num));
  
  if (num === 10) return 'sepuluh';
  if (num === 11) return 'sebelas';
  if (num < 20) return digitToIndonesian(String(num - 10)) + ' belas';
  
  const tens = Math.floor(num / 10);
  const ones = num % 10;
  
  if (ones === 0) {
    return digitToIndonesian(String(tens)) + ' puluh';
  }
  return digitToIndonesian(String(tens)) + ' puluh ' + digitToIndonesian(String(ones));
};

// Convert queue number to spoken Indonesian with proper number grouping
const formatQueueForSpeech = (queueNumber: string): string => {
  const letter = queueNumber.charAt(0);
  const numbers = queueNumber.slice(1);
  
  const numValue = parseInt(numbers, 10);
  const firstDigit = parseInt(numbers.charAt(0), 10);
  const lastTwo = parseInt(numbers.slice(1), 10);
  
  let spokenNumbers = '';
  
  if (numValue === 0) {
    spokenNumbers = 'nol nol nol';
  } else if (firstDigit === 0) {
    if (lastTwo < 10) {
      spokenNumbers = 'nol nol ' + digitToIndonesian(String(lastTwo));
    } else {
      spokenNumbers = 'nol ' + twoDigitToIndonesian(lastTwo);
    }
  } else {
    if (numValue < 10) {
      spokenNumbers = 'nol nol ' + digitToIndonesian(String(numValue));
    } else if (numValue < 100) {
      spokenNumbers = 'nol ' + twoDigitToIndonesian(numValue);
    } else if (numValue === 100) {
      spokenNumbers = 'seratus';
    } else if (numValue < 200) {
      spokenNumbers = 'seratus ' + twoDigitToIndonesian(numValue - 100);
    } else {
      const hundreds = Math.floor(numValue / 100);
      const remainder = numValue % 100;
      if (remainder === 0) {
        spokenNumbers = digitToIndonesian(String(hundreds)) + ' ratus';
      } else {
        spokenNumbers = digitToIndonesian(String(hundreds)) + ' ratus ' + twoDigitToIndonesian(remainder);
      }
    }
  }
  
  return `${letter} ${spokenNumbers}`;
};

// OPTIMIZED ding sound - uses pre-generated buffer for instant playback
export const playDingSound = async (): Promise<void> => {
  console.log('[Audio] playDingSound called');
  try {
    const ctx = await initAudioContext();
    console.log('[Audio] AudioContext state:', ctx?.state, 'Buffer ready:', !!dingSoundBuffer);
    
    if (!ctx || !dingSoundBuffer) {
      console.log('[Audio] Falling back to simple ding');
      return playSimpleDing();
    }
    
    // Resume context if suspended
    if (ctx.state === 'suspended') {
      console.log('[Audio] Resuming suspended AudioContext');
      await ctx.resume();
    }
    
    // Play first ding
    const source1 = ctx.createBufferSource();
    const gain1 = ctx.createGain();
    source1.buffer = dingSoundBuffer;
    source1.connect(gain1);
    gain1.connect(ctx.destination);
    gain1.gain.value = 0.5;
    source1.start(0);
    console.log('[Audio] First ding started');
    
    // Play second ding after short delay (for emphasis)
    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          const source2 = ctx.createBufferSource();
          const gain2 = ctx.createGain();
          
          // Create higher pitched buffer for second ding
          const sampleRate = ctx.sampleRate;
          const duration = 0.6;
          const buffer2 = ctx.createBuffer(1, sampleRate * duration, sampleRate);
          const data2 = buffer2.getChannelData(0);
          
          for (let i = 0; i < data2.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 6);
            data2[i] = Math.sin(2 * Math.PI * 1046 * t) * envelope * 0.4;
          }
          
          source2.buffer = buffer2;
          source2.connect(gain2);
          gain2.connect(ctx.destination);
          source2.start(0);
          console.log('[Audio] Second ding started');
          
          setTimeout(resolve, 400);
        } catch (err) {
          console.error('[Audio] Second ding failed:', err);
          resolve();
        }
      }, 120);
    });
  } catch (error) {
    console.error('[Audio] Failed to play optimized ding:', error);
    return playSimpleDing();
  }
};

// Fallback simple ding using oscillator
const playSimpleDing = (): Promise<void> => {
  return new Promise((resolve) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.frequency.setValueAtTime(830, ctx.currentTime);
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
      
      setTimeout(resolve, 400);
    } catch {
      resolve();
    }
  });
};

// Speed mapping for browser TTS (0.5-2.0)
const getBrowserTTSSpeed = (speed: 'slow' | 'normal' | 'fast'): number => {
  switch (speed) {
    case 'slow': return 0.7;
    case 'normal': return 0.9;
    case 'fast': return 1.2;
    default: return 0.9;
  }
};

// Get available Indonesian voices - uses cached voices
export const getIndonesianVoices = (): SpeechSynthesisVoice[] => {
  if (!('speechSynthesis' in window)) return [];
  
  // Use cached voices if available
  const voices = voicesLoaded ? cachedVoices : window.speechSynthesis.getVoices();
  return voices.filter(voice => 
    voice.lang.startsWith('id') || 
    voice.lang.startsWith('ID') ||
    voice.name.toLowerCase().includes('indonesia')
  );
};

// Get all available voices for selection - uses cached voices
export const getAllVoices = (): SpeechSynthesisVoice[] => {
  if (!('speechSynthesis' in window)) return [];
  return voicesLoaded ? cachedVoices : window.speechSynthesis.getVoices();
};

// OPTIMIZED Browser TTS - reduced overhead
const playBrowserTTS = (text: string, speed: number, voiceName?: string): Promise<void> => {
  return new Promise((resolve) => {
    console.log('[Audio] playBrowserTTS called:', { text, speed, voiceName });
    
    if (!('speechSynthesis' in window)) {
      console.warn('[Audio] speechSynthesis not available');
      resolve();
      return;
    }
    
    // Cancel any ongoing speech immediately
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Use cached voices for faster lookup
    const voices = voicesLoaded ? cachedVoices : window.speechSynthesis.getVoices();
    console.log('[Audio] Available voices:', voices.length, 'Cached:', voicesLoaded);
    
    if (voiceName) {
      const selectedVoice = voices.find(v => v.name === voiceName);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log('[Audio] Using selected voice:', voiceName);
      }
    }
    
    // Fallback to Indonesian voice if no voice selected
    if (!utterance.voice) {
      const indonesianVoice = voices.find(v => v.lang.startsWith('id'));
      if (indonesianVoice) {
        utterance.voice = indonesianVoice;
        console.log('[Audio] Using Indonesian fallback:', indonesianVoice.name);
      } else {
        console.log('[Audio] No Indonesian voice found, using default');
      }
    }
    
    utterance.lang = 'id-ID';
    utterance.rate = speed;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    // Set timeout to prevent hanging
    const timeout = setTimeout(() => {
      console.warn('[Audio] TTS timeout after 10s, resolving');
      window.speechSynthesis.cancel();
      resolve();
    }, 10000);
    
    utterance.onstart = () => {
      console.log('[Audio] TTS started speaking');
    };
    
    utterance.onend = () => {
      console.log('[Audio] TTS finished speaking');
      clearTimeout(timeout);
      resolve();
    };
    
    utterance.onerror = (e) => {
      clearTimeout(timeout);
      console.error('[Audio] TTS error:', e.error);
      resolve();
    };
    
    window.speechSynthesis.speak(utterance);
    console.log('[Audio] TTS speak() called');
  });
};

// Apply pronunciation mappings to text
const applyPronunciationMappings = (text: string, pronunciations: Array<{ original: string; spoken: string }>): string => {
  let result = text;
  for (const mapping of pronunciations) {
    if (mapping.original && mapping.spoken) {
      const regex = new RegExp(mapping.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      result = result.replace(regex, mapping.spoken);
    }
  }
  return result;
};

// Helper to get custom audio URL by phrase key
const getCustomAudioUrl = (phrases: CustomAudioPhrase[], phraseKey: string): string | null => {
  const phrase = phrases.find((p) => p.phrase === phraseKey);
  return phrase?.audioUrl || null;
};

// OPTIMIZED: Announcement with custom audio - reduced delays
const announceWithCustomAudio = async (
  queueNumber: string,
  destination: string,
  voiceConfig: ReturnType<typeof getVoiceConfig>
) => {
  const { customAudioPhrases, speed, voiceName } = voiceConfig;
  const browserSpeed = getBrowserTTSSpeed(speed);
  
  const isTeller = destination.toLowerCase().includes('teller');
  const destinationPhraseKey = isTeller ? 'teller' : 'customer_service';
  
  const nomorAntrianAudio = getCustomAudioUrl(customAudioPhrases, 'nomor_antrian');
  const silakanMenujuAudio = getCustomAudioUrl(customAudioPhrases, 'silakan_menuju');
  const destinationAudio = getCustomAudioUrl(customAudioPhrases, destinationPhraseKey);
  
  const spokenQueueNumber = formatQueueForSpeech(queueNumber);
  
  try {
    // Play "Nomor Antrian" (custom or TTS)
    if (nomorAntrianAudio) {
      await playCustomAudio(nomorAntrianAudio);
    } else {
      await playBrowserTTS('Nomor antrian', browserSpeed, voiceName);
    }
    
    // REDUCED pause (was 200ms)
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Play queue number via TTS
    await playBrowserTTS(spokenQueueNumber, browserSpeed, voiceName);
    
    // REDUCED pause (was 200ms)
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Play "Silakan Menuju ke" (custom or TTS)
    if (silakanMenujuAudio) {
      await playCustomAudio(silakanMenujuAudio);
    } else {
      await playBrowserTTS('silakan menuju ke', browserSpeed, voiceName);
    }
    
    // REDUCED pause (was 200ms)
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Play destination (custom or TTS)
    if (destinationAudio) {
      await playCustomAudio(destinationAudio);
    } else {
      const spokenDestination = applyPronunciationMappings(destination, voiceConfig.pronunciations || []);
      await playBrowserTTS(spokenDestination, browserSpeed, voiceName);
    }
  } catch (error) {
    console.error('[Audio] Error playing custom audio announcement:', error);
    // Fallback to full TTS
    const spokenDestination = applyPronunciationMappings(destination, voiceConfig.pronunciations || []);
    const fallbackText = `Nomor antrian ${spokenQueueNumber}, silakan menuju ke ${spokenDestination}`;
    await playBrowserTTS(fallbackText, browserSpeed, voiceName);
  }
};

// Main announcement function with Indonesian pronunciation (uses localStorage config)
export const announceQueue = async (queueNumber: string, destination: string) => {
  const voiceConfig = getVoiceConfig();
  await announceQueueWithConfig(queueNumber, destination, voiceConfig);
};

// OPTIMIZED: Main announcement function with explicit config
export const announceQueueWithConfig = async (queueNumber: string, destination: string, voiceConfig: ReturnType<typeof getVoiceConfig>) => {
  console.log('[Audio] Starting announcement for:', queueNumber, 'to', destination);
  
  try {
    // Ensure audio context is ready
    await initAudioContext();
    
    // Play ding first
    await playDingSound();
    console.log('[Audio] Ding completed');
    
    // REDUCED delay after ding (was 300ms)
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Check if custom audio is enabled
    const hasCustomAudio = voiceConfig.useCustomAudio && 
      voiceConfig.customAudioPhrases?.some(p => p.audioUrl);
    
    if (hasCustomAudio) {
      console.log('[Audio] Using custom audio announcement');
      await announceWithCustomAudio(queueNumber, destination, voiceConfig);
    } else {
      // Use full TTS announcement
      const spokenQueueNumber = formatQueueForSpeech(queueNumber);
      const spokenDestination = applyPronunciationMappings(destination, voiceConfig.pronunciations || []);
      const announcementText = `Nomor antrian ${spokenQueueNumber}, silakan menuju ke ${spokenDestination}`;
      const browserSpeed = getBrowserTTSSpeed(voiceConfig.speed);
      console.log('[Audio] TTS text:', announcementText);
      await playBrowserTTS(announcementText, browserSpeed, voiceConfig.voiceName);
    }
    
    console.log('[Audio] Announcement completed');
  } catch (error) {
    console.error('[Audio] Error during announcement:', error);
  }
};

// Force reload voices (useful for testing)
export const reloadVoices = () => {
  voicesLoaded = false;
  preloadVoices();
};
