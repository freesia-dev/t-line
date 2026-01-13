// Queue management with daily reset

export interface QueueState {
  csQueue: number;
  tellerQueue: number;
  csServing: number;
  tellerServing: number;
  lastResetDate: string;
}

export interface PrintConfig {
  showLogo: boolean;
  bankName: string;
  branchName: string;
  branchType: string;
  footerMessage: string;
  fontSize: 'small' | 'medium' | 'large';
  paperSize: '58mm' | '80mm';
}

export interface DisplayConfig {
  showAnimation: boolean;
  buttonSize: 'medium' | 'large' | 'xlarge';
  showQueueCount: boolean;
}

export interface TVDisplayConfig {
  layout: 'layout1' | 'layout2' | 'layout3' | 'layout4';
  showMedia: boolean;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  showRunningText: boolean;
  runningText: string;
  runningTextSpeed: 'slow' | 'medium' | 'fast';
}

export interface VoiceConfig {
  voiceName: string;
  speed: 'slow' | 'normal' | 'fast';
}

const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  voiceName: '',
  speed: 'normal',
};

const DEFAULT_QUEUE_STATE: QueueState = {
  csQueue: 0,
  tellerQueue: 0,
  csServing: 0,
  tellerServing: 0,
  lastResetDate: new Date().toDateString(),
};

const DEFAULT_PRINT_CONFIG: PrintConfig = {
  showLogo: true,
  bankName: 'PT BANK PEMBANGUNAN DAERAH KALIMANTAN TIMUR DAN KALIMANTAN UTARA',
  branchName: 'KCP KELAS 2 TELIHAN',
  branchType: 'Bankaltimtara',
  footerMessage: 'Jika nomor anda terlewat mohon untuk mengambil nomor kembali',
  fontSize: 'large',
  paperSize: '80mm',
};

const DEFAULT_DISPLAY_CONFIG: DisplayConfig = {
  showAnimation: true,
  buttonSize: 'large',
  showQueueCount: true,
};

const DEFAULT_TV_DISPLAY_CONFIG: TVDisplayConfig = {
  layout: 'layout1',
  showMedia: true,
  mediaType: 'image',
  mediaUrl: '',
  showRunningText: true,
  runningText: 'Suku Bunga Deposito: 1 Bulan 3.25% | 3 Bulan 3.50% | 6 Bulan 3.75% | 12 Bulan 4.00% | Tabungan Simpeda 1.00% | Giro 0.50%',
  runningTextSpeed: 'medium',
};

export const getQueueState = (): QueueState => {
  const stored = localStorage.getItem('queueState');
  if (stored) {
    const state: QueueState = JSON.parse(stored);
    // Check if we need to reset (new day)
    const today = new Date().toDateString();
    if (state.lastResetDate !== today) {
      const resetState = { ...DEFAULT_QUEUE_STATE, lastResetDate: today };
      localStorage.setItem('queueState', JSON.stringify(resetState));
      return resetState;
    }
    return state;
  }
  localStorage.setItem('queueState', JSON.stringify(DEFAULT_QUEUE_STATE));
  return DEFAULT_QUEUE_STATE;
};

export const saveQueueState = (state: QueueState): void => {
  localStorage.setItem('queueState', JSON.stringify(state));
};

export const getPrintConfig = (): PrintConfig => {
  const stored = localStorage.getItem('printConfig');
  if (stored) {
    return JSON.parse(stored);
  }
  localStorage.setItem('printConfig', JSON.stringify(DEFAULT_PRINT_CONFIG));
  return DEFAULT_PRINT_CONFIG;
};

export const savePrintConfig = (config: PrintConfig): void => {
  localStorage.setItem('printConfig', JSON.stringify(config));
};

export const getDisplayConfig = (): DisplayConfig => {
  const stored = localStorage.getItem('displayConfig');
  if (stored) {
    return JSON.parse(stored);
  }
  localStorage.setItem('displayConfig', JSON.stringify(DEFAULT_DISPLAY_CONFIG));
  return DEFAULT_DISPLAY_CONFIG;
};

export const saveDisplayConfig = (config: DisplayConfig): void => {
  localStorage.setItem('displayConfig', JSON.stringify(config));
};

export const getTVDisplayConfig = (): TVDisplayConfig => {
  const stored = localStorage.getItem('tvDisplayConfig');
  if (stored) {
    return { ...DEFAULT_TV_DISPLAY_CONFIG, ...JSON.parse(stored) };
  }
  localStorage.setItem('tvDisplayConfig', JSON.stringify(DEFAULT_TV_DISPLAY_CONFIG));
  return DEFAULT_TV_DISPLAY_CONFIG;
};

export const saveTVDisplayConfig = (config: TVDisplayConfig): void => {
  localStorage.setItem('tvDisplayConfig', JSON.stringify(config));
};

export const getVoiceConfig = (): VoiceConfig => {
  const stored = localStorage.getItem('voiceConfig');
  if (stored) {
    return { ...DEFAULT_VOICE_CONFIG, ...JSON.parse(stored) };
  }
  localStorage.setItem('voiceConfig', JSON.stringify(DEFAULT_VOICE_CONFIG));
  return DEFAULT_VOICE_CONFIG;
};

export const saveVoiceConfig = (config: VoiceConfig): void => {
  localStorage.setItem('voiceConfig', JSON.stringify(config));
};

export const takeCSQueue = (): { number: number; remaining: number } => {
  const state = getQueueState();
  state.csQueue += 1;
  saveQueueState(state);
  return { 
    number: state.csQueue, 
    remaining: state.csQueue - state.csServing - 1 
  };
};

export const takeTellerQueue = (): { number: number; remaining: number } => {
  const state = getQueueState();
  state.tellerQueue += 1;
  saveQueueState(state);
  return { 
    number: state.tellerQueue, 
    remaining: state.tellerQueue - state.tellerServing - 1 
  };
};

export const resetQueue = (): void => {
  const resetState = { ...DEFAULT_QUEUE_STATE, lastResetDate: new Date().toDateString() };
  localStorage.setItem('queueState', JSON.stringify(resetState));
};

export const formatQueueNumber = (type: 'CS' | 'TELLER', number: number): string => {
  const prefix = type === 'TELLER' ? 'A' : 'B';
  return `${prefix}${String(number).padStart(3, '0')}`;
};
