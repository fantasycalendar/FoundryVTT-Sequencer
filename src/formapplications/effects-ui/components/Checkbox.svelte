<script>
  import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
  import { applyStyles } from "@typhonjs-fvtt/runtime/svelte/action";
  import { writable } from "svelte/store";

  export let setting;
  export let label = false;
  export let lock = false;
  export let inverse = false
  export let styles = {};

  const store = setting.store;
  const isLocked = lock ? lock.store : writable(inverse);

</script>

<div style="display: flex; align-items: center;" use:applyStyles={styles}>
	<input disabled={$isLocked !== inverse} style="height:15px;" type="checkbox" bind:checked={$store}/>
	<label>{localize(setting.label)}</label>
</div>
