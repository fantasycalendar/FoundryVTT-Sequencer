<script>
	import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
  import { applyStyles } from "@typhonjs-fvtt/runtime/svelte/action";
  import { writable } from "svelte/store";

  export let setting;
  export let lock = false;
  export let inverse = false;
  export let styles = {};

  const id = "sequencer-input-" + randomID();
  const store = setting.store;
  const isLocked = lock ? lock.store : writable(inverse);
</script>

<div style="display: flex; align-items: center;" use:applyStyles={styles}>
	{#if localize(setting.label)}
		<label for={id}>{localize(setting.label)}</label>
	{/if}
	<input id={id} type="number" disabled={$isLocked !== inverse} bind:value={$store} on:change={() => { if($store === null) $store = 0; }}/>
</div>


<style lang="scss">
	label {
    text-align: right;
    flex: 1 0 auto;
		padding-right: 0.25rem;
	}

	input {
		width: 100%;
		flex: 1 0 40%;
	}
</style>
