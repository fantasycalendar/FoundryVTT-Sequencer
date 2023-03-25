<script>
  import { localize } from '@typhonjs-fvtt/runtime/svelte/helper';
  import { VisibleEffects } from "../../modules/sequencer-visible-effects-store.js";
  import EffectEntry from "./components/EffectEntry.svelte";

  $: effects = Object.values($VisibleEffects);
  $: persistentEffects = effects.filter(effect => effect.data.persist);
  $: temporaryEffects = effects.filter(effect => !effect.data.persist);

  function endAllEffects() {
		Sequencer.EffectManager.endEffects({ effects: effects.filter(effect => effect.userCanDelete && !effect.data.private) });
	}

</script>

<div class="effects-container">

	<button class="w-100 end-all-effects mb-2" type="button" on:click={endAllEffects}>
		{localize("SEQUENCER.Manager.EndAllEffects")}
	</button>

	{#if !effects.length}

		<div class="no-effects">
			<h2>{localize("SEQUENCER.Manager.NoEffects")}</h2>
		</div>

	{:else}

		<div class="effects">

			{#if persistentEffects.length}
			<h2>{localize("SEQUENCER.Manager.PersistentEffects")}</h2>
			<div>
				{#each persistentEffects as effect (effect.id)}
					<EffectEntry {effect}/>
				{/each}
			</div>
			{/if}

			{#if temporaryEffects.length && persistentEffects.length}
				<hr/>
			{/if}

			{#if temporaryEffects.length}
				<h2>{localize("SEQUENCER.Manager.TemporaryEffects")}</h2>
				<div>
					{#each temporaryEffects as effect (effect.id)}
						<EffectEntry {effect}/>
					{/each}
				</div>
			{/if}

		</div>

	{/if}

</div>

<style lang="scss">

  .effects-container {
    height: 100%;
    width: 100%;
    min-width: 300px;
		min-height: 563px;
    display: flex;
    flex-direction: column;

		& > div {
      padding: 5px 0;
      max-height: calc(425px - 5rem);
      overflow-y: scroll;
      overflow-x: hidden;
      flex: 1;
      flex-direction: row;
		}
  }

</style>
