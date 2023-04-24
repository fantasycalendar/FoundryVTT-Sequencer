<script>

  import TreeView from "./TreeView.svelte";
  import { databaseStore } from "./DatabaseStore.js";
  import * as lib from "../../lib/lib.js";

  export let entry;

  const flattenedEntries = databaseStore.flattenedEntries;
  const search = databaseStore.search;
  const searchRegex = databaseStore.searchRegex;

  const fullPath = (parent ? parent + "." : "") + branch;

  let subPaths = []
  let paths = [];

  $: {
    subPaths = lib.make_array_unique($flattenedEntries
      .filter(e => {
        return e.startsWith(fullPath + ".") || e === fullPath
      })
      .map(e => {
        return e.split(fullPath)[1]
      })
    )
    paths = lib.make_array_unique(subPaths
      .map(e => {
        return e.split(".")[1]
      })
      .filter(Boolean));
  }

  $: highlight = branch.replace(
    $searchRegex,
    "<mark>$&</mark>"
  );

  $: forceOpen = open || ($search && subPaths.length && subPaths.every(e => {
    return (parent + "." + e).match($searchRegex)
  }))

  let flashFilePath = false
  let flashDBPath = false
  let openChildren = false;

</script>

<div class="database-entry">
	<div class="database-entry-text-container">
		<a on:click={(e) => {
			if(e.ctrlKey && parent){
        openChildren = !open;
			}
      open = !open;
    }}>
			{#if paths.length}
				<i class="fas" class:fa-angle-down={open} class:fa-angle-right={!open}></i>
			{/if}
		</a>
		{#if !paths.length}
			<a class="database-entry-button" on:click={() => {
				databaseStore.copyPath(fullPath, true)
				flashFilePath = true;
				setTimeout(() => {
					flashFilePath = false
				}, 400);
			}}>
				<i class="fas fa-file" class:flash-it={flashFilePath}></i>
			</a>
		{/if}
		{#if parent}
			<a class="database-entry-button" on:click={() => {
				databaseStore.copyPath(fullPath)
				flashDBPath = true;
				setTimeout(() => {
					flashDBPath = false
				}, 400);
			}}>
				<i class="fas fa-database" class:flash-it={flashDBPath}></i>
			</a>
			<a class="database-entry-button" on:click={() => {
				databaseStore.playFile(fullPath)
			}}>
				<i class="fas fa-play"></i>
			</a>
		{/if}
		<div class="database-entry-text" title="{branch}">
			<div class="database-entry-text-highlight">{@html highlight}</div>
			{branch}
		</div>
	</div>
</div>

<style lang="scss">

  .database-entry {
    flex: 1 0 auto;

    .database-entry-text-container {
      flex: 1;
      display: flex;
      align-items: center;

      .database-entry-button {
        padding: 0 0 0 3px;
        font-size: 0.7rem;
        line-height: normal;
        cursor: pointer;
      }

      a {
        display: flex;
        align-items: center;
        justify-content: center;
        max-width: 15px;
      }

      a > i {
        flex: 0 0 15px;
        min-width: 15px;
      }
    }
  }

  .database-entry > button > i {
    font-size: 0.7rem;
  }

  .sub-leaves {
    padding-left: 1rem;
    padding-bottom: 0.25rem;
    display: flex;
    flex-direction: column;
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
