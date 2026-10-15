import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Standard utility function to merge Tailwind CSS classes safely
 * combining clsx conditional mapping with tailwind-merge conflict resolution.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default cn;
