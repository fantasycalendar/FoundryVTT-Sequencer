<script>

	import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
  import { writable } from "svelte/store";

  export let setting;
  export let lock = false;
  export let min = 0.1;
  export let max = 3;
  export let maxInput = Infinity;
  export let step = 0.01;

  const store = setting.store;
  const isLocked = lock ? lock.store : writable(false);

</script>

<label>{localize(setting.label)}</label>
<input disabled={$isLocked} type="range" {min} {step} {max} bind:value="{$store}"/>
<input disabled={$isLocked} type="number" {min} {step} max={maxInput} required bind:value="{$store}"/>
