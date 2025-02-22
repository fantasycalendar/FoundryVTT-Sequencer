<script>

  import { databaseStore } from "./DatabaseStore.js";
  import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";

  export let data;

  const searchRegex = databaseStore.searchRegex;

  let flashFilePath = false;
  let flashDBPath = false;

  $: highlight = data.path.replace(
    $searchRegex,
    "<mark>$&</mark>"
  );

</script>

<div class="database-entry" style="margin-left:{data.depth * 15}px;">
	<div class="database-entry-text-container">
		{#if data.hasChildren}
			<a on:click={(e) => {
				databaseStore.openTreePath(data.fullPath, !data.open, e.ctrlKey);
			}}>
				<i class="fas" class:fa-angle-down={data.open} class:fa-angle-right={!data.open}></i>
			</a>
		{/if}
		{#if data.fullPath.includes(".")}
			{#if !data.hasChildren}
				<a class="database-entry-button" title="{localize('SEQUENCER.Database.CopyFilePath')}" on:click={(e) => {
					databaseStore.copyPath(data.fullPath, true, e.ctrlKey)
					flashFilePath = true;
					setTimeout(() => {
						flashFilePath = false
					}, 400);
				}}>
					<i class="fas fa-file" class:flash-it={flashFilePath}></i>
				</a>
			{/if}
			<a class="database-entry-button" title="{localize('SEQUENCER.Database.CopyDatabasePath')}" on:click={(e) => {
				databaseStore.copyPath(data.fullPath, false, e.ctrlKey)
				flashDBPath = true;
				setTimeout(() => {
					flashDBPath = false
				}, 400);
			}}>
				<i class="fas fa-database" class:flash-it={flashDBPath}></i>
			</a>
			<a class="database-entry-button" title="{localize('SEQUENCER.Database.PlayPreview')}" on:click={() => {
				databaseStore.playFile(data.fullPath)
			}}>
				<i class="fas fa-play"></i>
			</a>
		{/if}
		<div class="database-entry-text" title="{data.path}">
			<div class="database-entry-text-highlight">{@html highlight}</div>
			{data.path}
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
