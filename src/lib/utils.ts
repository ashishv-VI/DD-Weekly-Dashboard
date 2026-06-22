import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

export function formatPercent(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)}%`
}

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)
}

export function formatPosition(n: number): string {
  return n.toFixed(1)
}

export function getChangeColor(change: number): string {
  if (change > 0) return "text-green-600"
  if (change < 0) return "text-red-600"
  return "text-gray-500"
}

export function getPositionChangeColor(change: number): string {
  // For position: lower is better, so negative change is good
  if (change < 0) return "text-green-600"
  if (change > 0) return "text-red-600"
  return "text-gray-500"
}

export function calcChange(current: number, previous: number): number {
  if (previous === 0) return 0
  return ((current - previous) / previous) * 100
}
