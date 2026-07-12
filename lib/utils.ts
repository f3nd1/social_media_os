import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Title-cases a lowercase role string ("marketing manager" -> "Marketing Manager").
export function roleLabel(role: string): string {
  return role
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

// Strips an uploaded file name down to characters safe for a temp file path.
export function sanitizeFileName(fileName: string, fallback: string): string {
  const safeName = fileName.replace(/[^a-z0-9._-]/gi, "-").slice(0, 100);
  return safeName || fallback;
}
