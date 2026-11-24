export interface DirectionSection {
  title: string
  steps: string[]
}
export interface Recipe {
  id: string
  title: string
  yieldText: string
  baseline: number | null
  ingredients: string[]
  directions: DirectionSection[]
  source: string
  notes: string
}
export function blankRecipe(source = ''): Recipe {
  return {
    id: crypto.randomUUID(),
    title: '',
    yieldText: '',
    baseline: null,
    ingredients: [],
    directions: [],
    source,
    notes: '',
  }
}
export function safeSource(source: string): string | null {
  try {
    const url = new URL(source)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}
// A count of cookies or an unqualified range is not necessarily a serving count.
export function inferBaseline(value: string): number | null {
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*(?:servings?|portions?|people)?$/i)
  const count = match ? Number(match[1]) : 0
  return count > 0 && Number.isFinite(count) ? count : null
}
export function isRecipe(value: unknown): value is Recipe {
  if (!value || typeof value !== 'object') return false
  const r = value as Record<string, unknown>
  return (
    ['id', 'title', 'yieldText', 'source', 'notes'].every((key) => typeof r[key] === 'string') &&
    (r.baseline === null ||
      (typeof r.baseline === 'number' && Number.isFinite(r.baseline) && r.baseline > 0)) &&
    Array.isArray(r.ingredients) &&
    r.ingredients.every((s) => typeof s === 'string') &&
    Array.isArray(r.directions) &&
    r.directions.every(
      (s) =>
        s &&
        typeof s.title === 'string' &&
        Array.isArray(s.steps) &&
        s.steps.every((v: unknown) => typeof v === 'string'),
    )
  )
}
