<script>

  import { localize } from "#runtime/svelte/helper";
  import SequenceSection from "./SequenceSection.svelte";
  import SequenceStatus from "./SequenceStatus.svelte";
  import SequenceManager from "../../../modules/sequence-manager.js";
  import CONSTANTS from "../../../constants.js";

  export let sequence;
  export let index;

  const status = sequence.status;

</script>


<div class="sequence-name-container">
  <span>
    <SequenceStatus {status}/>
  </span>
  <span class="sequence-name">
    Sequence {index}{sequence.moduleName ? ` (${sequence.moduleName})` : ""}
  </span>
  <span class="sequence-actions">
    <a class="clear-sequence"
       class:sequence-done-show={$status > CONSTANTS.STATUS.RUNNING}
       on:click={() => { SequenceManager.RunningSequences.delete(sequence.id); }}
       data-tooltip={localize("SEQUENCER.Sequences.Clear")}
    >
      <i class="fas fa-trash-can"></i>
    </a>
    <a class:sequence-done-hide={$status > CONSTANTS.STATUS.RUNNING} on:click={() => { sequence._abort(); }} data-tooltip={localize("SEQUENCER.Sequences.AbortSequence")}>
      <i class="fas fa-stop"></i>
    </a>
  </span>
</div>
{#each sequence.sections as section}
  <SequenceSection {section} />
{/each}


<style lang="scss">

  .sequence-name-container{
    display: flex;
    font-weight: bold;
    padding: 3px 5px;
    border-radius: 3px;

    .sequence-name {
      flex: 1;
    }

    &:hover {
      background: rgba(0, 0, 0, 0.1);
    }

    .sequence-actions {
      display: flex;
      max-width: 10px;
      flex: 0 1 10px;
      & a {
        opacity: 0.35;
      }
    }

    &:hover .sequence-actions a {
      opacity: 0.7;

      &:hover{
        opacity: 1.0;
      }
    }

    .clear-sequence {
      margin-right: 0.5rem;
      display: none;
    }

    .sequence-done-show {
      display: block;
    }

    .sequence-done-hide {
      display: none;
    }

  }

</style>
