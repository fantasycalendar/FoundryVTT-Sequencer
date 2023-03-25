<script>
  import { localize } from '@typhonjs-fvtt/runtime/svelte/helper';
  import { VisibleEffects } from "../../modules/sequencer-visible-effects-store.js";

  $: effects = Object.values($VisibleEffects).map(effect => effect.data.name);

</script>

<div class="effects-container">

	<button type="button" class="w-100 end-all-effects mb-2">{localize("SEQUENCER.Manager.EndAllEffects")}</button>

	<h2 class="no-effects">{localize("SEQUENCER.Manager.NoEffects")}</h2>

	<div class="effects" style="display: none">

		<h2>{localize("SEQUENCER.Manager.PersistentEffects")}</h2>
		<div class="persistent-effects"></div>

		<hr>

		<h2>{localize("SEQUENCER.Manager.TemporaryEffects")}</h2>
		<div class="temporary-effects"></div>

	</div>

</div>

<style lang="scss">

  .effects-container{
    height: 100%;
    width: 100%;
    display:flex;
		flex-direction: column;
  }

</style>
