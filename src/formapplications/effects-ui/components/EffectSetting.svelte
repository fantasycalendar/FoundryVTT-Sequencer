<script>

  import { localize } from '#runtime/util/i18n';

  export let data;

  const key = data[0];
  const setting = data[1];

  $: value = setting.store;

</script>

<div class="effect-setting-input">
	<svelte:component bind:value={value} id={"player-"+setting.label} this={setting.component}/>
</div>

<div class="effect-setting-label">
	<label for={"player-"+setting.label}>
		{@html localize("SEQUENCER.Player.Option." + setting.label)}
	</label>
</div>
