import { mount } from '@vue/test-utils'
import { describe, expect, it, vi, afterEach } from 'vitest'
import RecipeEditor from '../../src/components/RecipeEditor.vue'
import App from '../../src/App.vue'
import { blankRecipe } from '../../src/domain/recipe'
import { STORAGE_KEY } from '../../src/platform/storage'

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})
describe('editable preview', () => {
  it('keeps changes isolated until save and retains section order', async () => {
    const recipe = {
      ...blankRecipe('https://example.com'),
      title: '<img onerror=alert(1)>',
      ingredients: ['1 cup rice'],
      directions: [{ title: 'Cook', steps: ['Boil.', 'Rest.'] }],
    }
    const wrapper = mount(RecipeEditor, { props: { recipe, heading: 'Import preview', error: '' } })
    await wrapper.find('input').setValue('My rice')
    expect(recipe.title).toBe('<img onerror=alert(1)>')
    expect(wrapper.find('img').exists()).toBe(false)
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('save')?.[0]?.[0]).toMatchObject({
      title: 'My rice',
      directions: recipe.directions,
    })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })
  it('preserves the editor and draft after a storage write failure', async () => {
    const wrapper = mount(App)
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Add your own')!
      .trigger('click')
    await wrapper.find('form input').setValue('Unsaved supper')
    await wrapper.findAll('textarea')[0]!.setValue('2 carrots')
    await wrapper.findAll('textarea')[1]!.setValue('Roast them.')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError')
    })
    await wrapper.find('form').trigger('submit')
    expect(wrapper.text()).toContain('Your draft is still here')
    expect((wrapper.find('form input').element as HTMLInputElement).value).toBe('Unsaved supper')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toHaveLength(3)
    wrapper.unmount()
  })
})
