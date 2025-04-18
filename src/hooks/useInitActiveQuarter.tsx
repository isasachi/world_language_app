// hooks/useInitActiveQuarter.ts
import { useEffect } from "react";
import { useQuarterStore } from "../store/quartersStore";

export const useInitActiveQuarter = () => {
  const { activeQuarter, fetchActiveQuarter } = useQuarterStore();

  useEffect(() => {
    if (!activeQuarter) {
      fetchActiveQuarter();
    }
  }, [activeQuarter, fetchActiveQuarter]);
};
