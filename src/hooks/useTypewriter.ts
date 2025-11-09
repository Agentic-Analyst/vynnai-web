import { useState, useEffect } from 'react';

interface UseTypewriterOptions {
  text: string;
  speed?: number;
  delay?: number;
  resetKey?: string | number; // Add a key to trigger reset
}

export function useTypewriter({ text, speed = 50, delay = 0, resetKey }: UseTypewriterOptions) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayedText('');
    setIsComplete(false);

    const startTimeout = setTimeout(() => {
      let currentIndex = 0;

      const interval = setInterval(() => {
        if (currentIndex < text.length) {
          setDisplayedText(text.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          setIsComplete(true);
          clearInterval(interval);
        }
      }, speed);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(startTimeout);
  }, [text, speed, delay, resetKey]); // Add resetKey to dependencies

  return { displayedText, isComplete };
}
