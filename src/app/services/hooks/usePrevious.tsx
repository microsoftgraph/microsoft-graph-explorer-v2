import { useEffect } from 'react';
import { useRef } from 'react';

/**
 * Keeps track of the previous value of the item passed to it before a re-render
 *
 * @param value
 * @description The ref object is a generic container whose current property is mutable
 *  and can hold any value, similar to an instance property on a class
 * @returns Return previous value
 *  (happens before update in useEffect)
 */
export function usePrevious(value: any) {
  const ref = useRef('');
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}
