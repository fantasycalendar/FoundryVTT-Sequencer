<script>
  import SequenceManager from "../../modules/sequence-manager.js";
  import EffectEntry from "../components/EffectEntry.svelte";
  import SoundEntry from "../components/SoundEntry.svelte";
  import MotionEntry from "../components/MotionEntry.svelte";
  import SequencerSoundManager from "../../modules/sequencer-sound-manager.js";
  import SequencerMotionManager from "../../modules/sequencer-motion-manager.js";

  const VisibleEffects = SequenceManager.VisibleEffects;
  const RunningSounds = SequenceManager.RunningSounds;
  const RunningMotions = SequenceManager.RunningMotions;

  let localize = game.i18n.localize.bind(game.i18n);
	let sounds = [];
  $: effects = Object.values($VisibleEffects);

  $: sounds = Object.values($RunningSounds);

  $: persistentEffects = effects.filter(effect => effect.data.persist);
  $: temporaryEffects = effects.filter(effect => !effect.data.persist);

  $: persistentSounds = sounds.filter(effect => effect.data.persist);
  $: temporarySounds = sounds.filter(effect => !effect.data.persist);

  $: motions = Object.values($RunningMotions);
  $: persistentMotions = motions.filter(motion => motion.data.persist || motion.data.persistUntilUpdate);
  $: temporaryMotions = motions.filter(motion => !motion.data.persist && !motion.data.persistUntilUpdate);

  function endAllEffects() {
    Sequencer.EffectManager.endEffects({
      effects: effects.filter(effect => effect.userCanDelete && !effect.data.private)
		});
  }

  function endAllSounds() {
    SequencerSoundManager.endSounds({
      sounds: Object.entries($RunningSounds)
        .map(e => e[0])
		});
  }

  function endAllMotions() {
    SequencerMotionManager.endAllMotions();
  }

</script>

<div class="effects-container">

  {#if !effects.length && !sounds.length && !motions.length}

    <div class="no-effects">
      <h2>{localize("SEQUENCER.Manager.NothingPlaying")}</h2>
    </div>

  {/if}

  {#if effects.length}
    <button class="w-100 end-all-effects mb-2" on:click={endAllEffects} type="button">
      {localize("SEQUENCER.Manager.EndAllEffects")}
    </button>

    <div class="effects">

      {#if persistentEffects.length}
        <h2>{localize("SEQUENCER.Manager.PersistentEffects")}</h2>
        <div>
          {#each persistentEffects as effect (effect.id)}
            <EffectEntry {effect} />
          {/each}
        </div>
      {/if}

      {#if temporaryEffects.length && persistentEffects.length}
        <hr />
      {/if}

      {#if temporaryEffects.length}
        <h2>{localize("SEQUENCER.Manager.TemporaryEffects")}</h2>
        <div>
          {#each temporaryEffects as effect (effect.id)}
            <EffectEntry {effect} />
          {/each}
        </div>
      {/if}

    </div>

  {/if}

  {#if sounds.length}
    <button class="w-100 end-all-effects mb-2" on:click={endAllSounds} type="button">
      {localize("SEQUENCER.Manager.EndAllSounds")}
    </button>

    <div>
	    {#if persistentSounds.length}
		    <h2>{localize("SEQUENCER.Manager.PersistentSounds")}</h2>
		    <div>
			    {#each persistentSounds as sound (sound.id)}
				    <SoundEntry {sound} />
			    {/each}
		    </div>
	    {/if}

	    {#if temporarySounds.length && persistentSounds.length}
		    <hr />
	    {/if}

	    {#if temporarySounds.length}
		    <h2>{localize("SEQUENCER.Manager.TemporarySounds")}</h2>
		    <div>
			    {#each temporarySounds as sound (sound.id)}
				    <SoundEntry {sound} />
			    {/each}
		    </div>
	    {/if}
    </div>

  {/if}

  {#if motions.length}
    <button class="w-100 end-all-effects mb-2" on:click={endAllMotions} type="button">
      {localize("SEQUENCER.Manager.EndAllMotions")}
    </button>

    <div>
      {#if persistentMotions.length}
        <h2>{localize("SEQUENCER.Manager.PersistentMotions")}</h2>
        <div>
          {#each persistentMotions as motion (motion.id)}
            <MotionEntry {motion} />
          {/each}
        </div>
      {/if}

      {#if temporaryMotions.length && persistentMotions.length}
        <hr />
      {/if}

      {#if temporaryMotions.length}
        <h2>{localize("SEQUENCER.Manager.TemporaryMotions")}</h2>
        <div>
          {#each temporaryMotions as motion (motion.id)}
            <MotionEntry {motion} />
          {/each}
        </div>
      {/if}
    </div>

  {/if}

</div>

<style lang="scss">

  .end-all-effects{
    margin-bottom: 0.5rem;
  }

  .effects-container {
    min-width: 320px;
    min-height: 563px;
    max-width: 320px;
    max-height: 563px;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }

  .effects {
    flex: 1;
    margin-top: 0.5rem;
  }

  .running-sequences {
    flex: 1;
    margin-top: 0.5rem;
  }

</style>
