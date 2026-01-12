// Queue management with Supabase real-time sync
import { supabase } from "@/integrations/supabase/client";

export interface QueueState {
  id: string;
  cs_queue: number;
  teller_queue: number;
  cs_serving: number;
  teller_serving: number;
  last_reset_date: string;
  last_called_type: string | null;
  last_called_number: number | null;
  last_called_at: string | null;
}

// Fetch current queue state from Supabase
export const fetchQueueState = async (): Promise<QueueState | null> => {
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('queue_state')
    .select('*')
    .single();
  
  if (error) {
    console.error('Error fetching queue state:', error);
    return null;
  }
  
  // Check if we need to reset (new day)
  if (data && data.last_reset_date !== today) {
    const { data: resetData, error: resetError } = await supabase
      .from('queue_state')
      .update({
        cs_queue: 0,
        teller_queue: 0,
        cs_serving: 0,
        teller_serving: 0,
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
      return data;
    }
    return resetData;
  }
  
  return data;
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

// Reset queue
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
        event: 'UPDATE',
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
