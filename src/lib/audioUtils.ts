// Audio utilities for queue system

// Ding sound as base64 (simple bell sound)
const DING_SOUND = 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU9vQ19v';

// Create a simple ding sound using Web Audio API
export const playDingSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create oscillator for the "ding" sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Bell-like frequency
    oscillator.frequency.setValueAtTime(830, audioContext.currentTime); // High note
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
      
      osc2.frequency.setValueAtTime(1046, audioContext.currentTime); // Higher note
      osc2.type = 'sine';
      
      gain2.gain.setValueAtTime(0.4, audioContext.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
      
      osc2.start(audioContext.currentTime);
      osc2.stop(audioContext.currentTime + 0.6);
    }, 150);
    
  } catch (error) {
    console.error('Failed to play ding sound:', error);
  }
};

// Text-to-speech announcement
export const announceQueue = (queueNumber: string, destination: string) => {
  if ('speechSynthesis' in window) {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(
      `Nomor antrian ${queueNumber}, silakan menuju ${destination}`
    );
    
    utterance.lang = 'id-ID';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    // Play ding first, then announce
    playDingSound();
    
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 500);
  } else {
    // Fallback to just ding if speech synthesis not available
    playDingSound();
  }
};
