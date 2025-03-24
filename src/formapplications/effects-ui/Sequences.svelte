<script>
  import { localize } from '#runtime/util/i18n';
  import { onMount, onDestroy } from "svelte";
  import SequenceManager from "../../modules/sequence-manager.js";
  import Sequence from "./components/Sequence.svelte";

  const VisibleEffects = SequenceManager.VisibleEffects;
  const RunningSequences = SequenceManager.RunningSequences;

  $: runningSequences = Object.entries($RunningSequences);

  onMount(() => {
    SequenceManager.RunningSequences.clearFinishedSequences();
  });

  onDestroy(() => {
    SequenceManager.RunningSequences.clearFinishedSequences();
  });

</script>

<div class="sequence-container">

  {#if !runningSequences.length}

    <div class="no-sequences">
      <h2>{localize("SEQUENCER.Sequences.NoSequences")}</h2>
    </div>

  {:else}

    <div class="sequence-button-header">
      <button type="button" on:click={() => {
         SequenceManager.RunningSequences.clearFinishedSequences();
      }}>
        {localize("SEQUENCER.Sequences.ClearFinished")}
      </button>
      <button type="button" on:click={() => {
         SequenceManager.RunningSequences.stopAll();
      }}>
        {localize("SEQUENCER.Sequences.StopAll")}
      </button>
    </div>

    <div class="running-sequences">
      {#each runningSequences as [id, sequence], index (id)}
        <Sequence {sequence} index={index+1}/>
      {/each}
    </div>

  {/if}

</div>

<style lang="scss">

  .sequence-container {
    min-width: 320px;
    min-height: 563px;
    max-width: 320px;
    max-height: 563px;
    display: flex;
    flex-direction: column;
  }

  .sequence-button-header{
    display: flex;
    button {
      font-size: 0.85rem;
    }
  }

  .effects {
    flex: 1;
    margin-top: 0.5rem;
  }

  .running-sequences{
    flex: 1;
    margin-top: 0.5rem;
  }

</style>
