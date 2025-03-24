<script>

  import { localize } from '#runtime/util/i18n';
  import { writable } from "svelte/store";
  import { applyStyles } from '#runtime/svelte/action/dom/style';

  export let setting;
  export let lock = false;
  export let min = 0.1;
  export let max = 2;
  export let maxInput = Infinity;
  export let step = 0.01;
  export let styles = {};

  const store = setting.store;
  const isLocked = lock ? lock.store : writable(false);

</script>

<div style="display: flex; align-items: center;" use:applyStyles={styles}>
	<label>{localize(setting.label)}</label>
	<input bind:value="{$store}" disabled={$isLocked} {max} {min} {step} type="range"/>
	<input bind:value="{$store}" disabled={$isLocked} max={maxInput} {min} required {step} type="number"/>
</div>

<style lang="scss">

	label {
		flex: 1 0 auto;
		margin-right: 0.25rem;
	}

	input[type="range"] {
    flex: 1 0 50%;
    margin-right: 0.25rem;
	}

	input[type="number"] {
    flex: 1 0 15%;
	}

</style>
