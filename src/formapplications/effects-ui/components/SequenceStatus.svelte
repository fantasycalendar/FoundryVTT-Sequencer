<script>

  import CONSTANTS from "../../../constants.js";

  export let status;

</script>

<i class="fa-solid background-circle"
   class:invisible={$status === CONSTANTS.STATUS.READY}
   class:fa-arrow-right={$status === CONSTANTS.STATUS.RUNNING || $status === CONSTANTS.STATUS.READY}
   class:fa-check={$status === CONSTANTS.STATUS.COMPLETE}
   class:fa-arrow-down={$status === CONSTANTS.STATUS.SKIPPED}
   class:fa-times={$status === CONSTANTS.STATUS.ABORTED}>
</i>
<i class="fa-solid "></i>

<style lang="scss">

  .background-circle{
    position: relative;
    z-index: 2;
    margin-right: 0.2rem;
    min-width: 1rem;
    text-align: center;
  }

  .invisible {
    opacity: 0;
  }

</style>
