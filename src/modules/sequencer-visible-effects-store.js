import { get, writable } from "svelte/store";

const VisibleEffects = writable({});

VisibleEffects.get = (id) => {
  return get(VisibleEffects)[id];
}

VisibleEffects.add = (id, data) => {
  VisibleEffects.update(effects => {
    effects[id] = data;
    return effects;
  })
}

VisibleEffects.delete = (id) => {
  VisibleEffects.update(effects => {
    delete effects[id];
    return effects;
  })
}

VisibleEffects.values = () => {
  return Object.values(get(VisibleEffects));
}

export { VisibleEffects };
