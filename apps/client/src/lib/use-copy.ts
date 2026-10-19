import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useRef, useState } from 'react';

const COPIED_MS = 1500;

/** Copies text to the clipboard; `copied` stays true for a moment afterwards, for a check mark. */
export function useCopy(): { copied: boolean; copy: (text: string) => void } {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback((text: string) => {
    Clipboard.setStringAsync(text)
      .then(() => {
        setCopied(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), COPIED_MS);
      })
      // The browser may refuse (e.g. no permission); nothing to show then.
      .catch(() => undefined);
  }, []);

  return { copied, copy };
}
