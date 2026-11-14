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

// Blood sugar in mg/dL, general adult fasting ranges.
export function bloodSugarStatus(mgdl) {
  if (mgdl < 70) return { label: 'Low', tone: 'warn' }
  if (mgdl < 100) return { label: 'Normal', tone: 'good' }
  if (mgdl < 126) return { label: 'Elevated', tone: 'warn' }
  return { label: 'High', tone: 'bad' }
}

// BMI = kg / m^2, using the standard adult WHO categories.
export function calculateBmi(weightKg, heightCm) {
  if (!weightKg || !heightCm) return null
  return weightKg / (heightCm / 100) ** 2
}

export function bmiStatus(bmi) {
  if (bmi < 18.5) return { label: 'Underweight', tone: 'warn' }
  if (bmi < 25) return { label: 'Normal', tone: 'good' }
  if (bmi < 30) return { label: 'Overweight', tone: 'warn' }
  return { label: 'Obese', tone: 'bad' }
}

// Flags a lab value against the reference range printed in the report (either end may be missing).
export function flagValue(value, low, high) {
  if (low == null && high == null) return { label: 'No range', tone: 'warn' }
  if (low != null && value < low) return { label: 'Low', tone: 'bad' }
  if (high != null && value > high) return { label: 'High', tone: 'bad' }
  return { label: 'Normal', tone: 'good' }
}
