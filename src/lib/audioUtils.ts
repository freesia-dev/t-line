// Audio utilities for queue system with ElevenLabs TTS

// Create a simple ding sound using Web Audio API
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

// ElevenLabs TTS announcement
const playElevenLabsTTS = async (text: string): Promise<boolean> => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text }),
      }
    );

    if (!response.ok) {
      console.error('ElevenLabs TTS failed:', response.status);
      return false;
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    return new Promise((resolve) => {
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        resolve(true);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        resolve(false);
      };
      audio.play().catch(() => resolve(false));
    });
  } catch (error) {
    console.error('ElevenLabs TTS error:', error);
    return false;
  }
};

// Fallback to browser TTS
const playBrowserTTS = (text: string): Promise<void> => {
  return new Promise((resolve) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      utterance.rate = 0.9;
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

// Main announcement function with ElevenLabs TTS and fallback
export const announceQueue = async (queueNumber: string, destination: string) => {
  const announcementText = `Nomor antrian ${queueNumber}, silakan menuju ${destination}`;
  
  // Play ding first
  await playDingSound();
  
  // Small delay after ding
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Try ElevenLabs TTS first, fallback to browser TTS
  const elevenLabsSuccess = await playElevenLabsTTS(announcementText);
  
  if (!elevenLabsSuccess) {
    console.log('Falling back to browser TTS');
    await playBrowserTTS(announcementText);
  }
};
