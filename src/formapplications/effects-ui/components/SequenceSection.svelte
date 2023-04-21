<script>

  import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
  import SequenceStatus from "./SequenceStatus.svelte";
  import CONSTANTS from "../../../constants.js";

  export let section;

  const status = section.sectionStatus;
  const sectionName = (section?.constructor?.niceName ? section?.constructor?.niceName : section.constructor.name) + (section?._name ? " - " + section._name : "");

</script>

<div>
  <span>
    <SequenceStatus {status}/>
  </span>
  <span class="section-name">{sectionName}</span>
  <span class="sequence-actions" data-tooltip={localize("SEQUENCER.Sequences.AbortSection")}>
    <a class:section-done={$status > CONSTANTS.STATUS.READY} on:click={() => { section._abortSection(); }}>
      <i class="fas fa-stop"></i>
    </a>
  </span>
</div>

<style lang="scss">
  div {
    display: flex;
    flex-direction: row;
    align-items: center;
    margin-left: 0.5rem;
    padding: 3px 5px;
    border-radius: 3px;

    .section-name {
      flex: 1;
    }

    &:hover {
      background: rgba(0, 0, 0, 0.1);
    }

    .sequence-actions {
      opacity: 0.3;
    }

    &:hover .sequence-actions {
      opacity: 0.8;
    }

    .section-done {
      display: none;
    }
  }
</style>
