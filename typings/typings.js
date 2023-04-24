export default async function registerTypes(register) {
  fetch("modules/sequencer/typings/types.d.ts")
    .then((response) => response.text())
    .then((content) => register("sequencer/types.d.ts", content));
}
