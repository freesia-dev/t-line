// Audio utilities for queue system with Indonesian TTS

import { getVoiceConfig } from './queueStore';

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
// A001 → A nol nol satu
// A011 → A nol sebelas
// A111 → A seratus sebelas
// A023 → A nol dua puluh tiga
const formatQueueForSpeech = (queueNumber: string): string => {
  const letter = queueNumber.charAt(0);
  const numbers = queueNumber.slice(1);
  
  // Remove leading zeros to get actual number
  const numValue = parseInt(numbers, 10);
  
  // Get first digit (hundreds place)
  const firstDigit = parseInt(numbers.charAt(0), 10);
  // Get last two digits
  const lastTwo = parseInt(numbers.slice(1), 10);
  
  let spokenNumbers = '';
  
  if (numValue === 0) {
    // 000 case
    spokenNumbers = 'nol nol nol';
  } else if (firstDigit === 0) {
    // 0XX case - first digit is zero
    if (lastTwo < 10) {
      // 00X case - nol nol X
      spokenNumbers = 'nol nol ' + digitToIndonesian(String(lastTwo));
    } else {
      // 0XY case - nol + two digit pronunciation
      spokenNumbers = 'nol ' + twoDigitToIndonesian(lastTwo);
    }
  } else {
    // XXX case - three digits, use proper Indonesian number
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

export const playDingSound = (): Promise<void> => {
  return new Promise((resolve) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create oscillator for the "ding" sound
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Bell-like frequency
      oscillator.frequency.setValueAtTime(830, audioContext.currentTime);
      oscillator.type = 'sine';
      
      // Envelope for bell-like decay
      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.8);
      
      // Second ding for emphasis
      setTimeout(() => {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        
        osc2.frequency.setValueAtTime(1046, audioContext.currentTime);
        osc2.type = 'sine';
        
        gain2.gain.setValueAtTime(0.4, audioContext.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
        
        osc2.start(audioContext.currentTime);
        osc2.stop(audioContext.currentTime + 0.6);
        
        setTimeout(resolve, 600);
      }, 150);
      
    } catch (error) {
      console.error('Failed to play ding sound:', error);
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

// Get available Indonesian voices
export const getIndonesianVoices = (): SpeechSynthesisVoice[] => {
  if (!('speechSynthesis' in window)) return [];
  
  const voices = window.speechSynthesis.getVoices();
  return voices.filter(voice => 
    voice.lang.startsWith('id') || 
    voice.lang.startsWith('ID') ||
    voice.name.toLowerCase().includes('indonesia')
  );
};

// Get all available voices for selection
export const getAllVoices = (): SpeechSynthesisVoice[] => {
  if (!('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices();
};

// Browser TTS with voice selection
const playBrowserTTS = (text: string, speed: number, voiceName?: string): Promise<void> => {
  return new Promise((resolve) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Try to find the selected voice
      const voices = window.speechSynthesis.getVoices();
      if (voiceName) {
        const selectedVoice = voices.find(v => v.name === voiceName);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }
      
      // Fallback to Indonesian voice if no voice selected
      if (!utterance.voice) {
        const indonesianVoice = voices.find(v => v.lang.startsWith('id'));
        if (indonesianVoice) {
          utterance.voice = indonesianVoice;
        }
      }
      
      utterance.lang = 'id-ID';
      utterance.rate = speed;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      
      window.speechSynthesis.speak(utterance);
    } else {
      resolve();
    }
  });
};

// Main announcement function with Indonesian pronunciation
export const announceQueue = async (queueNumber: string, destination: string) => {
  const voiceConfig = getVoiceConfig();
  
  // Format queue number for proper Indonesian pronunciation
  const spokenQueueNumber = formatQueueForSpeech(queueNumber);
  const announcementText = `Nomor antrian ${spokenQueueNumber}, silakan menuju ke ${destination}`;
  
  // Play ding first
  await playDingSound();
  
  // Small delay after ding
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Use browser TTS with proper Indonesian pronunciation
  const browserSpeed = getBrowserTTSSpeed(voiceConfig.speed);
  await playBrowserTTS(announcementText, browserSpeed, voiceConfig.voiceName);
};
