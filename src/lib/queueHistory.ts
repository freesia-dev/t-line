import { supabase } from "@/integrations/supabase/client";

export interface QueueHistoryEntry {
  id: string;
  business_date: string;
  cs_total: number;
  teller_total: number;
  cs_served: number;
  teller_served: number;
  archived_at: string;
}

// Fetch queue history for the last N days (default 365 = 1 year)
export const fetchQueueHistory = async (
  days: number = 365
): Promise<QueueHistoryEntry[]> => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("queue_history")
    .select("*")
    .gte("business_date", cutoffStr)
    .order("business_date", { ascending: false })
    .limit(1000);

  if (error) {
    console.error("Error fetching queue history:", error);
    return [];
  }

  return (data ?? []) as QueueHistoryEntry[];
};
