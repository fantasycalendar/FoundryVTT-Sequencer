<script>

  import { localize } from "#runtime/svelte/helper";
  import { applyStyles } from "#runtime/svelte/action/dom";

	export let setting;
  export let styles = {};

  const store = setting.store;

  const width = 5.75;

  $: finalStyles = {
    ...styles,
		"--switch-width": `${width}em`,
		"--half-switch-width": `${width-1.5}em`,
		"--half-switch-width-on": `${width-1.7}em`,
	}

</script>

<div style="display: flex; align-items: center;" use:applyStyles={finalStyles}>

	<div class="first" class:active={!$store} on:click={() => { $store = false; }}>
		<span>{localize(setting.label_off)}</span>
	</div>
	<div class="second" class:active={$store} on:click={() => { $store = true; }}>
		<span>{localize(setting.label_on)}</span>
	</div>

</div>


<style lang="scss">

	div > div {
		display: flex;
		align-items: center;
		padding: 2px 5px;
		border: 1px solid #919191;
		cursor:pointer;
	}

	.first {
		border-bottom-left-radius: 5px;
		border-top-left-radius: 5px;
		background: #ccc;
    border-right: 0;
	}

	.second {
		border-bottom-right-radius: 5px;
		border-top-right-radius: 5px;
		background: #ccc;
	}

	.active {
    background: #eaeaea;
	}

</style>
