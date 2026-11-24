import { describe, expect, it, beforeEach } from 'vitest'
import { scaleIngredient } from '../../src/domain/scaler'
import { importRecipes } from '../../src/domain/importer'
import { inferBaseline, safeSource } from '../../src/domain/recipe'
import { sampleBlock } from '../../src/domain/samples'
import { loadCollection, saveCollection, STORAGE_KEY } from '../../src/platform/storage'

describe('scaling from immutable original quantities', () => {
  it.each([
    ['1½ cups rice', 4, 6, '2¼ cups rice'],
    ['2 (14 oz) cans of tomatoes', 4, 8, '4 (14 oz) cans of tomatoes'],
    ['salt to taste', 4, 8, 'salt to taste'],
    ['1.5 cups rice', 4, 6, '2¼ cups rice'],
    ['1/2 teaspoon salt', 4, 8, '1 teaspoon salt'],
    ['1 1/2 cups rice', 4, 6, '2¼ cups rice'],
    ['½ cup water', 4, 6, '¾ cup water'],
    ['1–2 teaspoons paprika', 4, 8, '2–4 teaspoons paprika'],
    ['1/2 to 1 cup water', 4, 8, '1–2 cup water'],
    ['.5 cup water', 4, 8, '1 cup water'],
    ['1/0 cup water', 4, 8, '1/0 cup water'],
    ['about 2 cups flour', 4, 8, 'about 2 cups flour'],
    ['2 x 400g tins', 4, 8, '4 x 400g tins'],
  ])('%s', (input, baseline, target, expected) =>
    expect(scaleIngredient(input, baseline, target)).toBe(expected),
  )
  it('returns to the exact original after repeated targets', () => {
    const original = '1 1/2 cups rice'
    expect([6, 8, 2, 4].map((s) => scaleIngredient(original, 4, s))).toEqual([
      '2¼ cups rice',
      '3 cups rice',
      '¾ cups rice',
      original,
    ])
  })
  it('preserves quantities for ambiguous and invalid yields', () => {
    expect(scaleIngredient('2 cups flour', null, 6)).toBe('2 cups flour')
    expect(scaleIngredient('2 cups flour', 4, NaN)).toBe('2 cups flour')
    expect(inferBaseline('4–6 servings')).toBeNull()
    expect(inferBaseline('1 loaf')).toBeNull()
    expect(inferBaseline('24 cookies')).toBeNull()
    expect(inferBaseline('4 servings')).toBe(4)
  })
})
describe('untrusted JSON-LD import', () => {
  it('preserves nested instruction headings and order', () => {
    const data = {
      '@type': 'Recipe',
      name: 'Layered supper',
      recipeInstructions: [
        {
          '@type': 'HowToSection',
          name: 'Prepare',
          itemListElement: [
            { '@type': 'HowToStep', text: 'Wash everything.' },
            {
              '@type': 'HowToSection',
              name: 'Sauce',
              itemListElement: [{ '@type': 'HowToStep', text: 'Stir the sauce.' }],
            },
          ],
        },
      ],
    }
    expect(importRecipes([JSON.stringify(data)], '')[0]!.directions).toEqual([
      { title: 'Prepare', steps: ['Wash everything.'] },
      { title: 'Prepare / Sauce', steps: ['Stir the sauce.'] },
    ])
  })
  const recipe = {
    '@type': ['Thing', 'Recipe'],
    name: 'Soup',
    recipeIngredient: ['2 carrots', 'salt'],
    recipeInstructions: 'Simmer.\nServe.',
  }
  it.each([recipe, [recipe], { '@graph': [recipe] }])(
    'handles top-level, arrays, and graphs',
    (value) => {
      const result = importRecipes([JSON.stringify(value)], 'https://example.com/soup')[0]!
      expect(result.ingredients).toEqual(['2 carrots', 'salt'])
      expect(result.directions[0]?.steps).toEqual(['Simmer.', 'Serve.'])
      expect(result.source).toBe('https://example.com/soup')
    },
  )
  it('skips malformed and irrelevant blocks, finds multiple candidates, preserves sections', () => {
    const result = importRecipes(
      ['{broken', 'null', '{"@type":"Recipe"}', sampleBlock],
      'https://example.com',
    )
    expect(result).toHaveLength(3)
    expect(result[0]!.directions.map((s) => s.title)).toEqual(['Cook the rice', 'Crisp & finish'])
    expect(result[0]!.directions[0]!.steps).toHaveLength(2)
    expect(result[0]!.ingredients[0]).toBe('1½ cups rice')
  })
  it('returns empty for unusable metadata and blocks executable source links', () => {
    expect(importRecipes(['bad', '{}', '{"@type":"Recipe","name":"Empty"}'], 'source')).toEqual([])
    expect(safeSource('javascript:alert(1)')).toBeNull()
    expect(safeSource('https://example.com')).toBe('https://example.com/')
  })
})
describe('local persistence', () => {
  beforeEach(() => localStorage.clear())
  it('roundtrips the collection, including an intentionally empty collection', () => {
    expect(loadCollection()).toBeNull()
    saveCollection([])
    expect(loadCollection()).toEqual([])
    const recipes = importRecipes([sampleBlock], '')
    saveCollection(recipes)
    expect(loadCollection()).toEqual(recipes)
  })
  it('does not overwrite malformed saved content', () => {
    localStorage.setItem(STORAGE_KEY, '[{"broken":true}]')
    expect(() => loadCollection()).toThrow('could not be read')
    expect(localStorage.getItem(STORAGE_KEY)).toBe('[{"broken":true}]')
  })
})
