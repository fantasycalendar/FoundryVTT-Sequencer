export default async function registerTypes (register)  {
  fetch('/modules/sequencer/scripts/typings/types.d.ts')
    .then(response => response.text())
    .then(content => register('sequencer/types.d.ts', content));
}
