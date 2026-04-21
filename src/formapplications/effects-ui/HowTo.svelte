<script>
	let localize = game.i18n.localize.bind(game.i18n);
	import * as lib from "/lib/lib.js"

	async function openSettings() {

		const settings = new foundry.applications.settings.SettingsConfig({ initialCategory: "sequencer" });

		await settings.render(true)

		await lib.wait(75);

		const focusElement = settings.element.querySelector('select[name="sequencer.permissions-effect-create"]');

		const scrollable = settings.element.querySelector("section.tab.scrollable.active")

		scrollable.scrollTo({ top: focusElement.offsetTop - 100, behavior: "smooth" });

		await lib.wait(250);

		focusElement.parentNode.parentNode.style.transition = "box-shadow 0.5s ease-in-out";
		focusElement.parentNode.parentNode.style.boxShadow = "rgba(200, 64, 67, 0.75) inset 0 0 10px, rgba(200, 64, 67, 0.75) 0 0 10px";

		await lib.wait(5000);

		focusElement.parentNode.parentNode.style.boxShadow = "none";

		await lib.wait(500);

		focusElement.parentNode.parentNode.style.transition = "none";

	}

</script>

<div class="howto-container">
	<p>{@html localize("SEQUENCER.HowTo.Welcome")}</p>
	<p>{@html localize("SEQUENCER.HowTo.Explanation")}</p>
	{#if game.user.isGM}
		<p>{@html localize("SEQUENCER.HowTo.PermissionsExplanation")}</p>
		<button type="button" class="w-100 open-module-settings" on:click={openSettings}>
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

  .howto-container {
    min-width: 320px;
    max-width: 320px;
    min-height: 563px;

    li {
      list-style: none;
      margin-bottom: 0.5rem;
    }
  }

</style>
