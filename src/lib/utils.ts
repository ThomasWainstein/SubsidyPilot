
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { v4 as uuidv4 } from 'uuid'; // Add UUID import

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Export the UUID function from the uuid package
export { uuidv4 }
