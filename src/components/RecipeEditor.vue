<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import type { Recipe } from '../domain/recipe'
const props = defineProps<{ recipe: Recipe; heading: string; error: string }>()
const emit = defineEmits<{ save: [recipe: Recipe]; cancel: [] }>()
const draft = ref<Recipe>(JSON.parse(JSON.stringify(props.recipe)))
const titleInput = ref<HTMLInputElement>()
const ingredientText = ref(draft.value.ingredients.join('\n'))
const directionText = ref(
  draft.value.directions
    .map((s) => `${s.title ? `# ${s.title}\n` : ''}${s.steps.join('\n')}`)
    .join('\n\n'),
)
const validation = ref('')
const baselineInput = computed({
  get: () => draft.value.baseline ?? '',
  set: (v: string | number) => {
    draft.value.baseline = v === '' ? null : Number(v)
  },
})
onMounted(async () => {
  await nextTick()
  titleInput.value?.focus()
})
function submit() {
  const ingredients = ingredientText.value
    .split(/\r?\n/)
    .map((v) => v.trim())
    .filter(Boolean)
  const directions: Recipe['directions'] = []
  for (const line of directionText.value
    .split(/\r?\n/)
    .map((v) => v.trim())
    .filter(Boolean)) {
    if (line.startsWith('# ')) directions.push({ title: line.slice(2), steps: [] })
    else {
      if (!directions.length) directions.push({ title: '', steps: [] })
      directions.at(-1)!.steps.push(line)
    }
  }
  if (!draft.value.title.trim() || !ingredients.length || !directions.some((s) => s.steps.length)) {
    validation.value = 'Add a title, at least one ingredient, and one direction before saving.'
    return
  }
  if (
    draft.value.baseline !== null &&
    (!Number.isFinite(draft.value.baseline) || draft.value.baseline <= 0)
  ) {
    validation.value = 'Baseline servings must be a positive number, or leave it empty.'
    return
  }
  emit('save', {
    ...draft.value,
    title: draft.value.title.trim(),
    ingredients,
    directions: directions.filter((s) => s.steps.length),
  })
}
</script>

<template>
  <section class="editor" aria-labelledby="editor-title">
    <div class="section-top">
      <div>
        <p class="eyebrow">MAKE IT YOURS</p>
        <h1 id="editor-title">{{ heading }}</h1>
      </div>
      <button class="quiet" type="button" @click="emit('cancel')">Cancel</button>
    </div>
    <p class="muted">
      Review the details before adding them to your box. Nothing is saved until you say so.
    </p>
    <form @submit.prevent="submit">
      <label
        >Recipe title<input
          ref="titleInput"
          v-model="draft.title"
          required
          placeholder="What are we cooking?"
      /></label>
      <div class="form-grid">
        <label
          >Original yield<input
            v-model="draft.yieldText"
            placeholder="e.g. 4 servings or 1 loaf" /></label
        ><label
          >Baseline servings<input
            v-model="baselineInput"
            type="number"
            min="0.01"
            step="any"
            placeholder="Enter if known"
            aria-describedby="baseline-help"
        /></label>
      </div>
      <p id="baseline-help" class="help">
        For an ambiguous yield, enter the number of portions the original ingredients make. Leave
        empty to keep original quantities.
      </p>
      <label
        >Ingredients <span class="label-detail">One ingredient per line</span
        ><textarea
          v-model="ingredientText"
          rows="7"
          required
          placeholder="1½ cups rice&#10;salt to taste"
        ></textarea>
      </label>
      <label
        >Directions
        <span class="label-detail">One step per line. Start a section heading with #</span
        ><textarea
          v-model="directionText"
          rows="9"
          required
          placeholder="# Prepare&#10;Rinse the rice."
        ></textarea>
      </label>
      <label
        >Source URL<input
          v-model="draft.source"
          type="text"
          inputmode="url"
          placeholder="https://…"
      /></label>
      <label
        >Personal notes<textarea
          v-model="draft.notes"
          rows="3"
          placeholder="What would you do again next time?"
        ></textarea>
      </label>
      <p v-if="validation || error" role="alert" class="notice error">{{ validation || error }}</p>
      <div class="editor-actions">
        <button type="submit" class="primary">Save recipe</button
        ><button type="button" class="quiet" @click="emit('cancel')">Cancel</button
        ><span class="help">Stored only in this browser.</span>
      </div>
    </form>
  </section>
</template>
