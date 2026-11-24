import { blankRecipe, inferBaseline } from './recipe'
import type { DirectionSection, Recipe } from './recipe'

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)
const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')
const hasType = (value: unknown, type: string): boolean =>
  (Array.isArray(value) ? value : [value]).some(
    (v) => typeof v === 'string' && v.split(/[/#]/).at(-1) === type,
  )

function instructions(value: unknown): DirectionSection[] {
  const sections: DirectionSection[] = []
  function visit(item: unknown, title = '') {
    if (Array.isArray(item)) {
      item.forEach((v) => visit(v, title))
      return
    }
    if (record(item) && hasType(item['@type'], 'HowToSection')) {
      const section: DirectionSection = { title: text(item.name), steps: [] }
      const nested = instructions(item.itemListElement)
      section.steps = nested.flatMap((s) => s.steps)
      if (section.steps.length) sections.push(section)
      return
    }
    const content =
      typeof item === 'string' ? item : record(item) ? text(item.text) || text(item.name) : ''
    if (!content.trim()) return
    let section = sections.at(-1)
    if (!section || section.title !== title) {
      section = { title, steps: [] }
      sections.push(section)
    }
    section.steps.push(
      ...content
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean),
    )
  }
  visit(value)
  return sections
}

export function importRecipes(blocks: string[], source: string): Recipe[] {
  const results: Recipe[] = []
  function walk(value: unknown) {
    if (Array.isArray(value)) {
      value.forEach(walk)
      return
    }
    if (!record(value)) return
    if (hasType(value['@type'], 'Recipe')) {
      const title = text(value.name)
      const ingredients = Array.isArray(value.recipeIngredient)
        ? value.recipeIngredient.map(text).filter(Boolean)
        : []
      const directions = instructions(value.recipeInstructions)
      // Incomplete but meaningful recipes remain editable. Empty metadata falls back to manual entry.
      if (title && (ingredients.length || directions.length)) {
        const rawYield = value.recipeYield
        const yieldText = Array.isArray(rawYield)
          ? rawYield.map((v) => String(v)).join(' / ')
          : typeof rawYield === 'number'
            ? String(rawYield)
            : text(rawYield)
        results.push({
          ...blankRecipe(source),
          title,
          ingredients,
          directions,
          yieldText,
          baseline: inferBaseline(yieldText),
        })
      }
    }
    if (value['@graph']) walk(value['@graph'])
  }
  for (const block of blocks) {
    try {
      walk(JSON.parse(block))
    } catch {
      /* A bad block must not hide a later recipe. */
    }
  }
  return results
}
