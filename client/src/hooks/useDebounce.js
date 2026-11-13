import { useEffect, useState } from 'react';

export function useDebounce(value, delay = 250) {
  const [result, setResult] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setResult(value), delay);
    return () => clearTimeout(handle);
  }, [value, delay]);
  return result;
}
