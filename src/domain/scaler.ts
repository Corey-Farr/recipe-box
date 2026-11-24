const unicode: Record<string, number> = {
  '½': 1 / 2,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '¼': 1 / 4,
  '¾': 3 / 4,
  '⅕': 1 / 5,
  '⅖': 2 / 5,
  '⅗': 3 / 5,
  '⅘': 4 / 5,
  '⅙': 1 / 6,
  '⅚': 5 / 6,
  '⅛': 1 / 8,
  '⅜': 3 / 8,
  '⅝': 5 / 8,
  '⅞': 7 / 8,
}
const numberPattern =
  '(?:\\d+\\s+\\d+\\/\\d+|\\d*\\s*[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]|\\d+\\/\\d+|\\d+(?:\\.\\d+)?|\\.\\d+)'
const leading = new RegExp(
  `^(\\s*)(${numberPattern})(?:\\s*(–|—|-|to)\\s*(${numberPattern}))?(?=\\s|$|[([{])`,
)
function parse(value: string): number {
  const trimmed = value.trim()
  const last = trimmed.at(-1) ?? ''
  if (last in unicode) return Number(trimmed.slice(0, -1).trim() || 0) + unicode[last]!
  const mixed = trimmed.match(/^(?:(\d+)\s+)?(\d+)\/(\d+)$/)
  if (mixed) return Number(mixed[1] || 0) + Number(mixed[2]) / Number(mixed[3])
  return Number(trimmed)
}
function format(value: number): string {
  const whole = Math.floor(value)
  const fraction = value - whole
  if (fraction < 0.000001) return String(whole)
  for (const [symbol, part] of Object.entries(unicode)) {
    if (Math.abs(part - fraction) < 0.000001) return `${whole || ''}${symbol}`
  }
  return String(Number(value.toFixed(3)))
}
// Only the leading quantity (or range) is scaled; parenthesized package sizes stay intact.
export function scaleIngredient(
  original: string,
  baseline: number | null,
  servings: number,
): string {
  if (
    !baseline ||
    baseline <= 0 ||
    servings <= 0 ||
    !Number.isFinite(baseline) ||
    !Number.isFinite(servings) ||
    servings === baseline
  )
    return original
  const match = original.match(leading)
  if (!match) return original
  const first = parse(match[2]!)
  const second = match[4] ? parse(match[4]) : null
  if (!Number.isFinite(first) || (second !== null && !Number.isFinite(second))) return original
  const ratio = servings / baseline
  return `${match[1]}${format(first * ratio)}${second !== null ? `–${format(second * ratio)}` : ''}${original.slice(match[0].length)}`
}
