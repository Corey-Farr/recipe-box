<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import RecipeEditor from './components/RecipeEditor.vue'
import { blankRecipe, safeSource } from './domain/recipe'
import type { Recipe } from './domain/recipe'
import { importRecipes } from './domain/importer'
import { scaleIngredient } from './domain/scaler'
import { sampleRecipes } from './domain/samples'
import { isExtension, importActivePage } from './platform/extension'
import { loadCollection, saveCollection } from './platform/storage'

const recipes = ref<Recipe[]>([])
const selectedId = ref('')
const selected = computed(() => recipes.value.find((r) => r.id === selectedId.value))
const search = ref('')
const filtered = computed(() =>
  recipes.value.filter((r) =>
    `${r.title} ${r.ingredients.join(' ')}`.toLowerCase().includes(search.value.toLowerCase()),
  ),
)
const draft = ref<Recipe | null>(null)
const editing = ref(false)
const candidates = ref<Recipe[]>([])
const candidateIndex = ref(0)
const candidateSelect = ref<HTMLSelectElement>()
const error = ref('')
const notice = ref('')
const storageBlocked = ref(false)
const servings = ref<number | string>(4)
const notes = ref('')
const checked = ref<string[]>([])
const titleEl = ref<HTMLElement>()
const searchEl = ref<HTMLInputElement>()
const targetServings = computed(() => Number(servings.value))
const validServings = computed(
  () => Number.isFinite(targetServings.value) && targetServings.value > 0,
)
const stepCount = computed(
  () => selected.value?.directions.reduce((n, s) => n + s.steps.length, 0) ?? 0,
)
const sourceLink = computed(() => safeSource(selected.value?.source ?? ''))

function load() {
  try {
    const existing = loadCollection()
    recipes.value = existing ?? (isExtension ? [] : sampleRecipes())
    if (existing === null) saveCollection(recipes.value)
    storageBlocked.value = false
    error.value = ''
  } catch (e) {
    storageBlocked.value = true
    error.value =
      e instanceof SyntaxError
        ? 'The saved collection could not be read. Your browser data has not been changed.'
        : e instanceof Error
          ? e.message
          : 'Browser storage is unavailable.'
    error.value += ' Enable browser storage and retry. Any open draft will stay here.'
  }
}
onMounted(async () => {
  load()
  const target = new URLSearchParams(location.search).get('import')
  if (isExtension && target !== null) {
    // Consume the launch intent: reloading the editor should open the collection.
    history.replaceState(null, '', location.pathname)
    await importTab(Number(target))
  }
})
async function focusTitle() {
  await nextTick()
  titleEl.value?.focus()
}
function openRecipe(recipe: Recipe) {
  selectedId.value = recipe.id
  servings.value = recipe.baseline ?? ''
  notes.value = recipe.notes
  checked.value = []
  notice.value = ''
  focusTitle()
}
async function back() {
  selectedId.value = ''
  notice.value = ''
  await nextTick()
  searchEl.value?.focus()
}
function preview(blocks: string[], source: string) {
  error.value = storageBlocked.value ? error.value : ''
  const found = importRecipes(blocks, source)
  editing.value = false
  if (found.length > 1) {
    candidates.value = found
    candidateIndex.value = 0
    nextTick(() => candidateSelect.value?.focus())
  } else draft.value = found[0] ?? blankRecipe(source)
  notice.value = found.length
    ? 'Recipe metadata found. Check the quantities and directions before saving.'
    : 'No usable recipe metadata found. Paste the ingredients and directions below; the source link is retained.'
}
function chooseCandidate() {
  draft.value = candidates.value[candidateIndex.value]!
  candidates.value = []
}
async function sampleImport() {
  const source = new URL('fixtures/recipes.html', location.href).href
  try {
    const response = await fetch(source)
    if (!response.ok) throw new Error('Fixture unavailable')
    const document = new DOMParser().parseFromString(await response.text(), 'text/html')
    const blocks = Array.from(
      document.querySelectorAll('script[type="application/ld+json"]'),
      (node) => node.textContent ?? '',
    )
    preview(blocks, source)
  } catch {
    error.value =
      'The sample page could not be loaded. Check your connection and try again, or use Add your own.'
  }
}
async function importTab(tabId: number) {
  notice.value = ''
  try {
    const page = await importActivePage(tabId)
    preview(page.blocks, page.source)
  } catch (e) {
    error.value = (e as Error).message
  }
}
function manual() {
  editing.value = false
  draft.value = blankRecipe()
  notice.value = ''
  if (!storageBlocked.value) error.value = ''
}
async function cancel() {
  draft.value = null
  candidates.value = []
  notice.value = ''
  if (selected.value) await focusTitle()
  else {
    await nextTick()
    searchEl.value?.focus()
  }
}
function persist(next: Recipe[]): boolean {
  if (storageBlocked.value) {
    error.value =
      'Storage is unavailable or unreadable. Enable storage and use Retry storage before saving. Your draft is still here.'
    return false
  }
  try {
    // Toolbar imports open independent tabs. Merge just this tab's changes into
    // the latest collection so saving here cannot erase a recipe saved elsewhere.
    const changes = next.filter(
      (recipe) => recipes.value.find((r) => r.id === recipe.id) !== recipe,
    )
    const latest = loadCollection() ?? []
    const merged = latest.map(
      (recipe) => changes.find((change) => change.id === recipe.id) ?? recipe,
    )
    merged.push(...changes.filter((change) => !latest.some((recipe) => recipe.id === change.id)))
    saveCollection(merged)
    recipes.value = merged
    error.value = ''
    return true
  } catch {
    error.value =
      'Could not save to browser storage. Free some space or enable storage, then try Save again. Your draft is still here.'
    return false
  }
}
function save(recipe: Recipe) {
  const next = recipes.value.some((r) => r.id === recipe.id)
    ? recipes.value.map((r) => (r.id === recipe.id ? recipe : r))
    : [...recipes.value, recipe]
  if (persist(next)) {
    draft.value = null
    openRecipe(recipe)
    notice.value = 'Recipe saved in this browser.'
  }
}
function edit() {
  if (selected.value) {
    draft.value = { ...selected.value, notes: notes.value }
    editing.value = true
    notice.value = ''
  }
}
function saveNotes() {
  if (!selected.value) return
  const next = recipes.value.map((r) =>
    r.id === selectedId.value ? { ...r, notes: notes.value } : r,
  )
  if (persist(next)) notice.value = 'Personal note saved.'
}
function freshSession() {
  checked.value = []
  notice.value = 'Fresh cooking session started. Your notes and original quantities are kept.'
}
</script>

<template>
  <div class="app-shell" :class="{ 'extension-shell': isExtension }">
    <header class="masthead">
      <a href="#" class="brand" aria-label="Recipe Box home" @click.prevent="back"
        ><span class="brand-mark" aria-hidden="true">r<span>•</span></span> recipe box<span
          class="brand-period"
          >.</span
        ></a
      ><span class="local-badge"
        >{{ isExtension ? 'EXTENSION' : 'LOCAL-FIRST' }} <span aria-hidden="true">/</span> YOUR
        KITCHEN</span
      >
    </header>
    <main id="main">
      <div v-if="error && !draft" class="notice error" role="alert">{{ error }}</div>
      <button v-if="storageBlocked" class="quiet retry" @click="load">Retry storage</button>
      <p v-if="notice" class="notice" role="status">{{ notice }}</p>
      <section v-if="candidates.length" class="candidate-panel">
        <p class="eyebrow">A FEW GOOD OPTIONS</p>
        <h1>Choose a recipe</h1>
        <p>This page contains {{ candidates.length }} recipes. Pick one to review.</p>
        <label
          >Recipe on this page<select ref="candidateSelect" v-model="candidateIndex">
            <option v-for="(recipe, index) in candidates" :key="recipe.id" :value="index">
              {{ recipe.title }}
            </option>
          </select></label
        >
        <div class="editor-actions">
          <button class="primary" @click="chooseCandidate">Review selected recipe</button
          ><button class="quiet" @click="cancel">Cancel</button>
        </div>
      </section>
      <RecipeEditor
        v-else-if="draft"
        :key="draft.id"
        :recipe="draft"
        :heading="editing ? 'Edit your recipe' : 'Import preview'"
        :error="error"
        @save="save"
        @cancel="cancel"
      />
      <template v-else-if="selected">
        <nav class="recipe-nav" aria-label="Recipe navigation">
          <button class="quiet" @click="back">All recipes</button
          ><button class="quiet" @click="edit">Edit recipe</button>
        </nav>
        <article class="recipe-detail">
          <div class="recipe-heading">
            <p class="eyebrow">FROM YOUR RECIPE BOX</p>
            <h1 ref="titleEl" tabindex="-1">{{ selected.title }}</h1>
            <div class="recipe-meta">
              <span>{{ selected.yieldText || 'Yield not specified' }}</span><span aria-hidden="true"
                >/</span
              ><a v-if="sourceLink" :href="sourceLink" target="_blank" rel="noopener noreferrer"
                >Original recipe ↗</a
              ><span v-else>{{
                selected.source ? 'Source link unavailable' : 'Recipe Box original'
              }}</span>
            </div>
          </div>
          <div class="cooking-toolbar">
            <div>
              <p class="eyebrow">AT YOUR PACE</p>
              <p>{{ checked.length }} of {{ selected.ingredients.length + stepCount }} checked</p>
            </div>
            <button class="quiet" @click="freshSession">Start fresh cooking session</button>
          </div>
          <div class="cooking-grid">
            <section class="ingredients-panel" aria-labelledby="ingredients-title">
              <div class="section-top">
                <h2 id="ingredients-title">Ingredients</h2>
                <span class="small-caps">THE GOOD STUFF</span>
              </div>
              <label v-if="selected.baseline" class="servings-control"
                >Servings<input v-model="servings" type="number" min="0.01" step="any" /><span
                  class="help"
                  >Original: {{ selected.baseline }}</span
                ></label
              >
              <p v-else class="notice">
                This yield needs a baseline before scaling.
                <button class="text-button" @click="edit">Set baseline servings</button>
              </p>
              <p v-if="selected.baseline && !validServings" role="alert" class="error notice">
                Enter a positive serving count. Original quantities are shown.
              </p>
              <ul class="check-list">
                <li v-for="(ingredient, i) in selected.ingredients" :key="i">
                  <label :class="{ completed: checked.includes(`i${i}`) }"
                    ><input v-model="checked" type="checkbox" :value="`i${i}`" /><span>{{
                      scaleIngredient(
                        ingredient,
                        selected.baseline,
                        validServings ? targetServings : (selected.baseline ?? 1),
                      )
                    }}</span></label
                  >
                </li>
              </ul>
              <p class="help">
                Ingredients scale from the original every time. Directions stay unchanged; check any
                quantities in the steps, seasoning, and cooking times.
              </p>
            </section>
            <section class="directions-panel" aria-labelledby="directions-title">
              <h2 id="directions-title">Let’s cook</h2>
              <div v-for="(section, si) in selected.directions" :key="si" class="direction-section">
                <h3 v-if="section.title">{{ section.title }}</h3>
                <ol class="check-list directions">
                  <li v-for="(step, i) in section.steps" :key="i">
                    <label :class="{ completed: checked.includes(`s${si}-${i}`) }"
                      ><input v-model="checked" type="checkbox" :value="`s${si}-${i}`" /><span
                        ><span class="step-number">{{
                          selected.directions.slice(0, si).reduce((n, s) => n + s.steps.length, 0) +
                          i +
                          1
                        }}</span
                        >{{ step }}</span
                      ></label
                    >
                  </li>
                </ol>
              </div>
            </section>
          </div>
          <section class="notes-panel">
            <div>
              <p class="eyebrow">A LITTLE BETTER NEXT TIME</p>
              <h2>Kitchen notes</h2>
              <p class="muted">The tweaks, swaps, and happy accidents worth keeping.</p>
            </div>
            <div>
              <label for="notes">Personal note</label
              ><textarea id="notes" v-model="notes" rows="4"></textarea
              ><button class="primary" @click="saveNotes">Save note</button>
            </div>
          </section>
        </article>
      </template>
      <template v-else>
        <section class="hero">
          <div>
            <p class="eyebrow">GOOD FOOD. YOUR WAY.</p>
            <h1>Keep what<br />you cook<span>.</span></h1>
            <p class="hero-copy">
              The recipe you found. The changes you made.<br class="desktop-break" />
              The little notes that make it yours.
            </p>
            <div class="hero-actions">
              <button v-if="!isExtension" class="primary" @click="sampleImport">
                Try a sample import</button
              ><button class="quiet" @click="manual">Add your own</button>
            </div>
            <p class="help">
              {{
                isExtension
                  ? 'To import, open a recipe page and click the Recipe Box toolbar button.'
                  : 'Try real recipe extraction with a built-in sample page.'
              }}
            </p>
          </div>
          <div class="hero-art" aria-hidden="true">
            <div class="plate">
              <div class="food rice"></div>
              <div class="food leaf one"></div>
              <div class="food leaf two"></div>
              <div class="food lemon"></div>
              <div class="food bean b1"></div>
              <div class="food bean b2"></div>
              <div class="food bean b3"></div>
            </div>
            <span class="art-label">FROM THE WEB TO YOUR TABLE</span>
          </div>
        </section>
        <section class="collection" aria-labelledby="collection-title">
          <div class="collection-toolbar">
            <div>
              <p class="eyebrow">SAVED FOR ANOTHER DAY</p>
              <h2 id="collection-title">
                Your collection <span class="count">{{ recipes.length }}</span>
              </h2>
            </div>
            <label class="search-label"
              ><span class="sr-only">Search by title or ingredient</span
              ><input
                ref="searchEl"
                v-model="search"
                type="search"
                placeholder="Search title or ingredient…"
            /></label>
          </div>
          <div v-if="filtered.length" class="recipe-grid">
            <button
              v-for="(recipe, i) in filtered"
              :key="recipe.id"
              class="recipe-card"
              @click="openRecipe(recipe)"
            >
              <div class="card-visual" :class="`tone-${i % 3}`" aria-hidden="true">
                <span class="card-illustration">{{
                  i % 3 === 0 ? '◒' : i % 3 === 1 ? '◍' : '▧'
                }}</span><span class="card-tag">{{
                  recipe.source ? 'SAVED RECIPE' : 'HOUSE RECIPE'
                }}</span>
              </div>
              <div class="card-body">
                <p class="small-caps">{{ recipe.yieldText || 'YOUR OWN RECIPE' }}</p>
                <h3>{{ recipe.title }}</h3>
                <p>
                  {{ recipe.ingredients.length }} ingredients <span aria-hidden="true">·</span>
                  {{ recipe.notes ? 'Kitchen notes inside' : 'Ready to make your own' }}
                </p>
                <span class="card-open">Open recipe <span aria-hidden="true">+</span></span>
              </div>
            </button>
          </div>
          <div v-else class="empty">
            <h3>{{ search ? 'No recipes found' : 'Your next favorite starts here' }}</h3>
            <p>
              {{
                search
                  ? 'Try a different title or ingredient.'
                  : 'Import a recipe or add one of your own.'
              }}
            </p>
          </div>
        </section>
        <aside class="privacy-note">
          <span class="privacy-icon" aria-hidden="true">⌂</span>
          <div>
            <strong>A little box. All yours.</strong>
            <p>
              No accounts, no tracking, no cloud.
              {{
                isExtension
                  ? 'This extension keeps its own collection on this device.'
                  : 'This demo saves in this browser. The Chrome extension has its own separate collection.'
              }}
            </p>
          </div>
        </aside>
      </template>
    </main>
    <footer>
      <span>recipe box. <span class="muted">/ made for the way you cook</span></span
      ><span>LOCAL BY DESIGN</span>
    </footer>
  </div>
</template>
