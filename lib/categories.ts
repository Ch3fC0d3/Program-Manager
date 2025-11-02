// Predefined budget categories
export const BUDGET_CATEGORIES = [
  'Operations',
  'Water/Desal',
  'Community',
  'Finance/Legal',
  'Technology',
  'Marketing',
  'Labor',
  'Insurance',
  'Equipment',
  'Facilities',
  'Training',
  'Travel',
  'Supplies',
  'Utilities',
  'Maintenance',
  'Professional Services',
  'Other'
] as const

export type BudgetCategory = typeof BUDGET_CATEGORIES[number]

// Helper to get category color for UI
export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'Operations': 'bg-blue-100 text-blue-800',
    'Water/Desal': 'bg-cyan-100 text-cyan-800',
    'Community': 'bg-green-100 text-green-800',
    'Finance/Legal': 'bg-purple-100 text-purple-800',
    'Technology': 'bg-indigo-100 text-indigo-800',
    'Marketing': 'bg-pink-100 text-pink-800',
    'Labor': 'bg-orange-100 text-orange-800',
    'Insurance': 'bg-red-100 text-red-800',
    'Equipment': 'bg-yellow-100 text-yellow-800',
    'Facilities': 'bg-teal-100 text-teal-800',
    'Training': 'bg-lime-100 text-lime-800',
    'Travel': 'bg-sky-100 text-sky-800',
    'Supplies': 'bg-amber-100 text-amber-800',
    'Utilities': 'bg-emerald-100 text-emerald-800',
    'Maintenance': 'bg-rose-100 text-rose-800',
    'Professional Services': 'bg-violet-100 text-violet-800',
    'Other': 'bg-gray-100 text-gray-800'
  }
  
  return colors[category] || 'bg-gray-100 text-gray-800'
}
