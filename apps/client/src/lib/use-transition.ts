import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

export const TRANSITION_MS = 150;

/**
 * Fades between 0 and 1 whenever `on` changes. Uses the JS driver by default:
 * colour animations can't run on the native driver (and the web has none).
 */
export function useTransition(
  on: boolean,
  { useNativeDriver = false, duration = TRANSITION_MS } = {},
): Animated.Value {
  const value = useRef(new Animated.Value(on ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(value, {
      toValue: on ? 1 : 0,
      duration,
      useNativeDriver,
    }).start();
  }, [on, value, useNativeDriver, duration]);
  return value;
}
