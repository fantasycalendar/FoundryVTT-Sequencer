export async function registerTypes (register)  {
  const response = await fetch('/modules/sequencer/scripts/types.d.ts')
  const content = await response.text()
  register('sequencer/types.d.ts', content)
}
