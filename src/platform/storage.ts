import { isRecipe } from '../domain/recipe'
import type { Recipe } from '../domain/recipe'
export const STORAGE_KEY = 'recipe-box.v1'
export function loadCollection(): Recipe[] | null {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === null) return null
  const data: unknown = JSON.parse(stored)
  if (!Array.isArray(data) || !data.every(isRecipe))
    throw new Error(
      'The saved collection could not be read. Your browser data has not been changed.',
    )
  return data
}
export function saveCollection(recipes: Recipe[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes))
}
