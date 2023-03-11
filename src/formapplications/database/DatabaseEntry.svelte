<script>


  import { createEventDispatcher } from "svelte";
  import { databaseStore } from "./DatabaseStore.js";

  const dispatch = createEventDispatcher();

	export let entry;

  const searchRegex = databaseStore.searchRegex;

  let flashFilePath = false;
  let flashDBPath = false;

  $: highlight = entry.replace(
    $searchRegex,
		"<mark>$&</mark>"
	);

</script>

<div
	class="database-entry"
	data-id="{entry}"
>
	<button type="button" class="btn_play" on:click={() => {
    databaseStore.playFile(entry)
  }}>
		<i class="fas fa-play"></i>
	</button>
	<button type="button" class="btn_copy_filepath" on:click={(e) => {
    databaseStore.copyPath(entry, true, e.ctrlKey)
    flashFilePath = true;
    setTimeout(() => {
      flashFilePath = false
    }, 400);
    }}>
		<i class:flash-it={flashFilePath} class="fas fa-file"></i>
	</button>
	<button type="button" class="btn_copy_databasepath" on:click={(e) => {
    databaseStore.copyPath(entry, false, e.ctrlKey)
    flashDBPath = true;
    setTimeout(() => {
      flashDBPath = false
    }, 400);
  }}>
		<i class:flash-it={flashDBPath} class="fas fa-database"></i>
	</button>

	<div class="database-entry-text" title="{entry}">
		<div class="database-entry-text-highlight">{@html highlight}</div>
		{entry}
	</div>
</div>

<style lang="scss">

  .database-entry{
    display:flex;
    flex: 1 0 auto;
  }

  select, input {
    color: black !important;
    background: rgba(255, 255, 255, 0.5) !important;
    margin-right: 0.25rem;
  }

  .database-entry > button{
    flex: 0;
		padding: 0 0 0 3px;
    font-size: 0.7rem !important;
    min-height: 20px;
    max-height: 20px;
    min-width: 20px;
    max-width: 20px;
    line-height: normal;
    margin-right: 2px !important;
  }

  .database-entry > button > i {
    font-size: 0.7rem;
  }

  .btn_play * {
    pointer-events: none;
  }

  .btn_copy_filepath, .btn_copy_databasepath{
    min-width: 1.5rem;
    padding: 0;
  }

  .database-entry > div{
    flex: 1;
    line-height:1.25rem;
  }

  .database-entry-text {
    position: relative;
		margin-left: 5px;
  }

  .database-entry-text-highlight {
    pointer-events: none;
    color: transparent;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .flash-it {
    -webkit-animation: flash linear 400ms forwards;
    animation: flash linear 400ms forwards;
  }

  @keyframes flash {
    0% {
      opacity: 1;
    }
    25% {
      opacity: .1;
    }
    50% {
      opacity: 1;
    }
    75% {
      opacity: .1;
    }
    100% {
      opacity: 1;
    }
  }

</style>
