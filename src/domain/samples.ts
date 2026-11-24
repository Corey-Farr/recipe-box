import { importRecipes } from './importer'

export const sampleBlock = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Recipe',
      name: 'Lemon rice & crispy chickpeas',
      recipeYield: '4 servings',
      recipeIngredient: [
        '1½ cups rice',
        '2 (14 oz) cans of chickpeas, drained',
        '2 tablespoons olive oil',
        '1 lemon, zest and juice',
        '½ cup chopped parsley',
        'salt to taste',
      ],
      recipeInstructions: [
        {
          '@type': 'HowToSection',
          name: 'Cook the rice',
          itemListElement: [
            {
              '@type': 'HowToStep',
              text: 'Rinse the rice until the water runs clear. Add to a saucepan with 2¼ cups water and a pinch of salt.',
            },
            {
              '@type': 'HowToStep',
              text: 'Bring to a simmer, cover, and cook on low for 15 minutes. Turn off the heat and rest, covered, for 10 minutes.',
            },
          ],
        },
        {
          '@type': 'HowToSection',
          name: 'Crisp & finish',
          itemListElement: [
            {
              '@type': 'HowToStep',
              text: 'Pat the chickpeas dry. Heat the oil in a wide skillet and fry the chickpeas for 8–10 minutes, stirring occasionally.',
            },
            {
              '@type': 'HowToStep',
              text: 'Fluff the rice with lemon zest and juice. Fold in the parsley, top with chickpeas, and season to taste.',
            },
          ],
        },
      ],
    },
    {
      '@type': 'Recipe',
      name: 'Smoky tomato & white bean pot',
      recipeYield: '4 servings',
      recipeIngredient: [
        '2 (14 oz) cans of tomatoes',
        '2 (15 oz) cans of white beans, drained',
        '1 onion, diced',
        '2 tablespoons olive oil',
        '1–2 teaspoons smoked paprika',
        '½ cup water',
        'salt to taste',
      ],
      recipeInstructions: [
        'Warm the oil in a heavy pot. Add the onion and cook gently for 8 minutes until soft.',
        'Stir in the paprika, then add tomatoes, beans, and water. Simmer for 20 minutes, stirring now and then.',
        'Mash a spoonful of beans into the sauce to thicken. Season and serve with crusty bread.',
      ],
    },
    {
      '@type': 'Recipe',
      name: 'Apple & oat skillet crumble',
      recipeYield: '6 servings',
      recipeIngredient: [
        '4 apples, cored and sliced',
        '¾ cup rolled oats',
        '½ cup flour',
        '⅓ cup brown sugar',
        '4 tablespoons butter',
        '1 teaspoon cinnamon',
      ],
      recipeInstructions: [
        'Heat the oven to 180°C / 350°F. Spread the apples in a buttered 9-inch ovenproof skillet.',
        'Rub the butter into the flour, oats, sugar, and cinnamon until clumpy. Scatter over the apples.',
        'Bake for 35–40 minutes until golden and bubbling. Let rest for 10 minutes before serving.',
      ],
    },
  ],
})
export function sampleRecipes() {
  const recipes = importRecipes([sampleBlock], 'https://example.com/recipe-box-originals')
  const notes = [
    'Extra lemon at the table. Dry the chickpeas well for crisp edges. A good Sunday lunch with cucumber salad.',
    'Made this with butter beans last time. Keep the paprika gentle and add a splash of water when reheating.',
    'A mix of tart and sweet apples works nicely. Lovely warm with plain yogurt the next morning.',
  ]
  return recipes.map((r, i) => ({ ...r, source: '', notes: notes[i]! }))
}
