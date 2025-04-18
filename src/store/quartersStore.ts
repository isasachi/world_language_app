// Zustand store for managing the global state of quarters
import { create } from 'zustand';
import { persist } from "zustand/middleware";
import { supabase } from "../supabase/supabaseClient";
import { Quarter } from '../types/Quarter';

interface QuarterStore {
    activeQuarter: Quarter | null;
    isLoading: boolean;
    fetchActiveQuarter: () => Promise<void>;
    setActiveQuarter: (quarter: Quarter | null) => void;
}  

export const useQuarterStore = create<QuarterStore>()(
    persist(
      (set) => ({
        activeQuarter: null,
        isLoading: true,
  
        fetchActiveQuarter: async () => {
          set({ isLoading: true });
          const { data, error } = await supabase
            .from("quarters")
            .select("*")
            .eq("active", true)
            .single();
  
          if (error) {
            console.error("Error fetching active quarter:", error.message);
            set({ isLoading: false });
            return;
          }
  
          set({
            activeQuarter: data,
            isLoading: false,
          });
        },
  
        setActiveQuarter: (quarter) => {
          set({ activeQuarter: quarter });
        },
      }),
      {
        name: "quarter-storage",
        partialize: (state) => ({ activeQuarter: state.activeQuarter }),
      }
    )
  );
  