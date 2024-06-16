<script>
  import { localize } from "#runtime/svelte/helper";
  import { applyStyles } from "#runtime/svelte/action/dom";
  import { writable } from "svelte/store";

  export let setting;
  export let label = false;
  export let lock = false;
  export let inverse = false
  export let styles = {};

	const id = "sequencer-input-" + foundry.utils.randomID();
  const store = setting.store;
  const isLocked = lock ? lock.store : writable(inverse);

  $: {
    if($isLocked !== inverse){
      $store = false;
		}
  }

</script>

<div style="display: flex; align-items: center;" use:applyStyles={styles}>
	<input id={id} disabled={$isLocked !== inverse} style="height:15px;" type="checkbox" bind:checked={$store}/>
	<label for={id}>{localize(setting.label)}</label>
</div>
