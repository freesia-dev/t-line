// Queue management with Supabase real-time sync
import { supabase } from "@/integrations/supabase/client";

export type QueueStatus = 'idle' | 'serving' | 'calling' | 'repeat' | 'break';

export interface QueueState {
  id: string;
  cs_queue: number;
  teller_queue: number;
  cs_serving: number;
  teller_serving: number;
  cs_status: QueueStatus;
  teller_status: QueueStatus;
  last_reset_date: string;
  last_called_type: string | null;
  last_called_number: number | null;
  last_called_at: string | null;
}

// Get current date in WIB (UTC+7), considering 6 AM as the reset boundary
const getWIBBusinessDate = (): string => {
  const now = new Date();
  // Convert to WIB (UTC+7)
  const wibTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  // If before 6 AM WIB, consider it still "yesterday"
  if (wibTime.getUTCHours() < 6) {
    wibTime.setUTCDate(wibTime.getUTCDate() - 1);
  }
  return wibTime.toISOString().split('T')[0];
};

// Fetch current queue state from Supabase
export const fetchQueueState = async (): Promise<QueueState | null> => {
  const today = getWIBBusinessDate();
  
  const { data, error } = await supabase
    .from('queue_state')
    .select('*')
    .single();
  
  if (error) {
    console.error('Error fetching queue state:', error);
    return null;
  }
  
  // Check if we need to reset (new business day based on 6 AM WIB)
  if (data && data.last_reset_date !== today) {
    const { data: resetData, error: resetError } = await supabase
      .from('queue_state')
      .update({
        cs_queue: 0,
        teller_queue: 0,
        cs_serving: 0,
        teller_serving: 0,
        cs_status: 'idle',
        teller_status: 'idle',
        last_reset_date: today,
        last_called_type: null,
        last_called_number: null,
        last_called_at: null,
      })
      .eq('id', data.id)
      .select()
      .single();
    
    if (resetError) {
      console.error('Error resetting queue state:', resetError);
      return data as QueueState;
    }
    return resetData as QueueState;
  }
  
  return data as QueueState;
};

// Take CS queue number
export const takeCSQueue = async (): Promise<{ number: number; remaining: number } | null> => {
  const state = await fetchQueueState();
  if (!state) return null;
  
  const newQueueNumber = state.cs_queue + 1;
  
  const { error } = await supabase
    .from('queue_state')
    .update({ cs_queue: newQueueNumber })
    .eq('id', state.id);
  
  if (error) {
    console.error('Error taking CS queue:', error);
    return null;
  }
  
  return {
    number: newQueueNumber,
    remaining: newQueueNumber - state.cs_serving - 1,
  };
};

// Take Teller queue number
export const takeTellerQueue = async (): Promise<{ number: number; remaining: number } | null> => {
  const state = await fetchQueueState();
  if (!state) return null;
  
  const newQueueNumber = state.teller_queue + 1;
  
  const { error } = await supabase
    .from('queue_state')
    .update({ teller_queue: newQueueNumber })
    .eq('id', state.id);
  
  if (error) {
    console.error('Error taking Teller queue:', error);
    return null;
  }
  
  return {
    number: newQueueNumber,
    remaining: newQueueNumber - state.teller_serving - 1,
  };
};

// Call next CS queue (updates serving number and triggers sound on display)
export const callNextCS = async (): Promise<{ number: number; remaining: number } | null> => {
  const state = await fetchQueueState();
  if (!state) return null;
  
  if (state.cs_serving >= state.cs_queue) {
    return null; // No one waiting
  }
  
  const newServing = state.cs_serving + 1;
  
  const { error } = await supabase
    .from('queue_state')
    .update({
      cs_serving: newServing,
      cs_status: 'calling',
      last_called_type: 'CS',
      last_called_number: newServing,
      last_called_at: new Date().toISOString(),
    })
    .eq('id', state.id);
  
  if (error) {
    console.error('Error calling next CS:', error);
    return null;
  }
  
  return {
    number: newServing,
    remaining: state.cs_queue - newServing,
  };
};

// Call next Teller queue (updates serving number and triggers sound on display)
export const callNextTeller = async (): Promise<{ number: number; remaining: number } | null> => {
  const state = await fetchQueueState();
  if (!state) return null;
  
  if (state.teller_serving >= state.teller_queue) {
    return null; // No one waiting
  }
  
  const newServing = state.teller_serving + 1;
  
  const { error } = await supabase
    .from('queue_state')
    .update({
      teller_serving: newServing,
      teller_status: 'calling',
      last_called_type: 'TELLER',
      last_called_number: newServing,
      last_called_at: new Date().toISOString(),
    })
    .eq('id', state.id);
  
  if (error) {
    console.error('Error calling next Teller:', error);
    return null;
  }
  
  return {
    number: newServing,
    remaining: state.teller_queue - newServing,
  };
};

// Skip current CS queue (move to next without serving)
export const skipCSQueue = async (): Promise<boolean> => {
  const state = await fetchQueueState();
  if (!state) return false;
  
  if (state.cs_serving >= state.cs_queue) {
    return false; // No one to skip
  }
  
  const newServing = state.cs_serving + 1;
  
  const { error } = await supabase
    .from('queue_state')
    .update({
      cs_serving: newServing,
      cs_status: 'idle',
    })
    .eq('id', state.id);
  
  if (error) {
    console.error('Error skipping CS queue:', error);
    return false;
  }
  
  return true;
};

// Skip current Teller queue (move to next without serving)
export const skipTellerQueue = async (): Promise<boolean> => {
  const state = await fetchQueueState();
  if (!state) return false;
  
  if (state.teller_serving >= state.teller_queue) {
    return false; // No one to skip
  }
  
  const newServing = state.teller_serving + 1;
  
  const { error } = await supabase
    .from('queue_state')
    .update({
      teller_serving: newServing,
      teller_status: 'idle',
    })
    .eq('id', state.id);
  
  if (error) {
    console.error('Error skipping Teller queue:', error);
    return false;
  }
  
  return true;
};

// Start serving CS
export const startServingCS = async (): Promise<boolean> => {
  const state = await fetchQueueState();
  if (!state) return false;
  
  const { error } = await supabase
    .from('queue_state')
    .update({ cs_status: 'serving' })
    .eq('id', state.id);
  
  if (error) {
    console.error('Error starting CS serving:', error);
    return false;
  }
  
  return true;
};

// Start serving Teller
export const startServingTeller = async (): Promise<boolean> => {
  const state = await fetchQueueState();
  if (!state) return false;
  
  const { error } = await supabase
    .from('queue_state')
    .update({ teller_status: 'serving' })
    .eq('id', state.id);
  
  if (error) {
    console.error('Error starting Teller serving:', error);
    return false;
  }
  
  return true;
};

// Finish serving CS
export const finishServingCS = async (): Promise<boolean> => {
  const state = await fetchQueueState();
  if (!state) return false;
  
  const { error } = await supabase
    .from('queue_state')
    .update({ cs_status: 'idle' })
    .eq('id', state.id);
  
  if (error) {
    console.error('Error finishing CS serving:', error);
    return false;
  }
  
  return true;
};

// Finish serving Teller
export const finishServingTeller = async (): Promise<boolean> => {
  const state = await fetchQueueState();
  if (!state) return false;
  
  const { error } = await supabase
    .from('queue_state')
    .update({ teller_status: 'idle' })
    .eq('id', state.id);
  
  if (error) {
    console.error('Error finishing Teller serving:', error);
    return false;
  }
  
  return true;
};

// Set CS break status
export const setCSBreak = async (isBreak: boolean): Promise<boolean> => {
  const state = await fetchQueueState();
  if (!state) return false;
  
  const { error } = await supabase
    .from('queue_state')
    .update({ cs_status: isBreak ? 'break' : 'idle' })
    .eq('id', state.id);
  
  if (error) {
    console.error('Error setting CS break:', error);
    return false;
  }
  
  return true;
};

// Set Teller break status
export const setTellerBreak = async (isBreak: boolean): Promise<boolean> => {
  const state = await fetchQueueState();
  if (!state) return false;
  
  const { error } = await supabase
    .from('queue_state')
    .update({ teller_status: isBreak ? 'break' : 'idle' })
    .eq('id', state.id);
  
  if (error) {
    console.error('Error setting Teller break:', error);
    return false;
  }
  
  return true;
};

// Repeat last call - triggers sound on display by updating last_called_at
export const repeatLastCall = async (
  type: 'CS' | 'TELLER',
  number: number
): Promise<boolean> => {
  const state = await fetchQueueState();
  if (!state) return false;
  
  const statusUpdate = type === 'CS' 
    ? { cs_status: 'repeat' as QueueStatus }
    : { teller_status: 'repeat' as QueueStatus };
  
  const { error } = await supabase
    .from('queue_state')
    .update({
      ...statusUpdate,
      last_called_type: type,
      last_called_number: number,
      last_called_at: new Date().toISOString(),
    })
    .eq('id', state.id);
  
  if (error) {
    console.error('Error repeating call:', error);
    return false;
  }
  
  return true;
};

export const resetQueue = async (): Promise<boolean> => {
  const state = await fetchQueueState();
  if (!state) return false;
  
  const { error } = await supabase
    .from('queue_state')
    .update({
      cs_queue: 0,
      teller_queue: 0,
      cs_serving: 0,
      teller_serving: 0,
      cs_status: 'idle',
      teller_status: 'idle',
      last_reset_date: new Date().toISOString().split('T')[0],
      last_called_type: null,
      last_called_number: null,
      last_called_at: null,
    })
    .eq('id', state.id);
  
  if (error) {
    console.error('Error resetting queue:', error);
    return false;
  }
  
  return true;
};

// Subscribe to queue state changes
export const subscribeToQueueState = (
  callback: (state: QueueState) => void
) => {
  const channel = supabase
    .channel('queue_state_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'queue_state',
      },
      (payload) => {
        callback(payload.new as QueueState);
      }
    )
    .subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
};

export const formatQueueNumber = (type: 'CS' | 'TELLER', number: number): string => {
  const prefix = type === 'TELLER' ? 'A' : 'B';
  return `${prefix}${String(number).padStart(3, '0')}`;
};

// Get status display text in Indonesian
export const getStatusText = (status: QueueStatus): string => {
  switch (status) {
    case 'idle': return 'Menunggu';
    case 'serving': return 'Sedang Dilayani';
    case 'calling': return 'Memanggil';
    case 'repeat': return 'Panggilan Ulang';
    case 'break': return 'Istirahat';
    default: return 'Menunggu';
  }
};
