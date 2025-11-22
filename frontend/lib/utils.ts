import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// <CHANGE> Added helper function for random data generation
export function generateMockData(length: number) {
  return Array.from({ length }, (_, i) => ({
    timestamp: new Date(Date.now() - (length - i) * 1000).toISOString(),
    value: Math.random() * 100,
    threshold: 80,
  }))
}
