import { useEffect, useState } from "react";

/**
 * Delays updating the returned value until after `delay` ms have passed
 * since the last time the input value changed.
 *
 * WHY: Every search keystroke in MasterPipeline triggered a full filter+sort
 * pass over hundreds of lead rows via useMemo. At 300ms debounce, the filter
 * runs at most once per typing pause instead of on every character.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
