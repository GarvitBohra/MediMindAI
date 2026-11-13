// Simple reference ranges for adults, for information only. Not a diagnosis.
// Returns { label, tone } where tone is one of: good, warn, bad.

export function heartRateStatus(bpm) {
  if (bpm < 60) return { label: 'Low', tone: 'warn' }
  if (bpm <= 100) return { label: 'Normal', tone: 'good' }
  return { label: 'High', tone: 'bad' }
}

export function bloodPressureStatus(systolic, diastolic) {
  if (systolic >= 140 || diastolic >= 90) return { label: 'High', tone: 'bad' }
  if (systolic >= 130 || diastolic >= 80) return { label: 'Elevated', tone: 'warn' }
  if (systolic < 90 || diastolic < 60) return { label: 'Low', tone: 'warn' }
  return { label: 'Normal', tone: 'good' }
}

export const toneClasses = {
  good: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  warn: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  bad: 'bg-red-50 text-red-700 ring-red-600/20',
}
