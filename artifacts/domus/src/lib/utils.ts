import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount)
}

export function formatDate(dateStr: string) {
  // "AAAA-MM-DD" é uma data de calendário, sem fuso: montar como data local
  // evita que "2026-10-10" apareça como 09/10 no horário do Brasil.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr)
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(dateStr)
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date)
}
