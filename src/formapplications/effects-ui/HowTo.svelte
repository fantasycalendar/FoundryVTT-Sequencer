<script>
  import { localize } from '@typhonjs-fvtt/runtime/svelte/helper';
</script>

<div class="howto-container">
	<p>{@html localize("SEQUENCER.HowTo.Welcome")}</p>
	<p>{@html localize("SEQUENCER.HowTo.Explanation")}</p>
	{#if game.user.isGM}
		<p>{@html localize("SEQUENCER.HowTo.PermissionsExplanation")}</p>
		<button type="button" class="w-100 open-module-settings">
			<i class="fas fa-plug"></i> {@html localize("SEQUENCER.HowTo.OpenModuleSettings")}
		</button>
	{/if}
	<p>{@html localize("SEQUENCER.HowTo.PlayerExplanation")}</p>
	<p>{@html localize("SEQUENCER.HowTo.LayerExplanation")}</p>
	<ol>
		<li>
			<strong>{@html localize("SEQUENCER.HowTo.Click")}</strong><br>
			{@html localize("SEQUENCER.HowTo.ClickLabel")}
		</li>
		<li>
			<strong>{@html localize("SEQUENCER.HowTo.ClickDrag")}</strong><br>
			{@html localize("SEQUENCER.HowTo.ClickDragLabel")}
		</li>
		<li>
			<strong>{@html localize("SEQUENCER.HowTo.Shift")}</strong><br>
			{@html localize("SEQUENCER.HowTo.ShiftLabel")}
		</li>
		<li>
			<strong>{@html localize("SEQUENCER.HowTo.ShiftControl")}</strong><br>
			{@html localize("SEQUENCER.HowTo.ShiftControlLabel")}
		</li>
		<li>
			<strong>{@html localize("SEQUENCER.HowTo.MoreToCome")}</strong>
		</li>
	</ol>
</div>

<style lang="scss">

  .howto-container{
    min-width: 320px;
    max-width: 320px;
    min-height: 563px;

    li{
      list-style: none;
      margin-bottom: 0.5rem;
    }
  }

</style>
