import { useDyrectedContext } from '../providers/DyrectedProvider';

/**
 * useDyrected — Access the Dyrected SDK client instance.
 * 
 * Usage:
 *   const { client } = useDyrected();
 */
export function useDyrected() {
  return useDyrectedContext();
}
