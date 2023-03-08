<script>

  import { ApplicationShell } from "@typhonjs-fvtt/runtime/svelte/component/core";
  import { localize } from '@typhonjs-fvtt/runtime/svelte/helper';
  import { writable } from "svelte/store";
  import VirtualScroll from "svelte-virtual-scroll-list"

  import SequencerDatabase from "../../modules/sequencer-database.js";
  import DatabaseEntry from "./DatabaseEntry.svelte";
  import { getContext } from "svelte";
  import { SequencerFile, SequencerFileRangeFind } from "../../modules/sequencer-file.js";
  import * as lib from "../../lib/lib.js";
  import CONSTANTS from "../../constants.js";

  const { application } = getContext("#external");

  export let elementRoot;

  let player, audio, image;

  let packs = [];
  let entries = [];
  let allRanges = false;
  let selectedPack = "all";
  let filteredEntries = [];

  const entriesStore = SequencerDatabase.entriesStore
  const search = writable("");

  $: searchRegex = new RegExp($search, "gu");

  $: {
    $entriesStore;
    packs = SequencerDatabase.publicModules
    const specificRanges = allRanges
      ? Sequencer.Database.publicFlattenedEntries
      : Sequencer.Database.publicFlattenedSimpleEntries;
    entries = specificRanges.map(
      (entry) => {
        return {
          pack: entry.split(".")[0],
          entry: entry
        };
      }
    );
  }

  $: {
    const searchParts = $search.split('|');
    filteredEntries = entries.filter((part) => {
      return (
        (selectedPack === "all" || selectedPack === part.pack) &&
        ($search === "" ||
          part.entry.match(searchRegex)?.length >=
          searchParts.length)
      );
    });
  }

  function getFileData(entryText) {

    let entry = SequencerDatabase.getEntry(entryText);

    let previewFile = entry?.file ?? entry;
    if (entry instanceof SequencerFile) {
      previewFile = entry.clone().getPreviewFile(entryText);
    }

    let lowerCaseEntry = previewFile ? previewFile.toLowerCase() : "unknown.jpg";

    const isAudio = lowerCaseEntry.endsWith("ogg") || lowerCaseEntry.endsWith("mp3") || lowerCaseEntry.endsWith("wav");
    const isImage = (!lowerCaseEntry.endsWith("webm")) && !isAudio;
    const isVideo = !isAudio && !isImage;
    const icon = previewFile ? (isVideo ? "fa-film" : (isAudio ? "fa-volume-high" : "fa-image")) : "fa-question-mark";
    const title = previewFile ? (isVideo ? "Animated WebM" : (isAudio ? "Audio" : "Image")) : "Unknown";

    return {
      file: previewFile ?? "unknown.jpg",
      dbEntry: entry,
      icon,
      title,
      isAudio,
      isImage,
      isVideo
    };

  }

  let metadata = false;

  function play(entry) {

    const { file, isAudio, isImage, isVideo } = getFileData(entry);

    audio.classList.toggle("hidden", !isAudio);
    image.classList.toggle("hidden", !isImage);
    player.classList.toggle("hidden", !isVideo);

    if (isImage) {
      image.src = file;
      return;
    }

    const element = isAudio ? audio : player;

    element.onerror = () => {
      const error = `Sequencer Database Viewer | Could not play file: ${file}`;
      ui.notifications.error(error);
      console.error(error);
    };

    element.oncanplay = () => {
      element.play();
    };

    element.onloadedmetadata = () => {
      metadata = {
        type: isVideo ? "Video" : (isAudio ? "Audio" : "Image"),
				duration: isImage ? "n/a" : (element.duration * 1000) + "ms"
			};
    };

    element.src = file;
  }

  function copyPath(dbPath, getFilepath) {

    const tempInput = document.createElement("input");
    tempInput.value = `${dbPath}`;

    let entry;
    if (getFilepath) {

      entry = Sequencer.Database.getEntry(dbPath);

      if (entry instanceof SequencerFile) {

        const specificFt = dbPath.match(CONSTANTS.FEET_REGEX);
        if (specificFt) {
          const ft = specificFt[0].replaceAll('.', '');
          entry = entry.getFile(ft);
        } else {
          const files = entry.getAllFiles();
          if (Array.isArray(files)) {
            const index = Math.floor(lib.interpolate(0, files.length - 1, 0.5));
            entry = files[index];
          }
        }
      }

      tempInput.value = `${entry?.file ?? entry}`;

    }

    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand("copy");
    document.body.removeChild(tempInput);
    document.execCommand("copy");

  }

</script>

<svelte:options accessors={true}/>

<ApplicationShell bind:elementRoot>

	<div class="sequencer-database-content">

		<div class="sequencer-database-header">
			<select bind:value={selectedPack} name="pack-select">
				<option value="all">{localize("SEQUENCER.Database.AllPacks")}</option>
				{#each packs as pack, index}
					<option>{ pack }</option>
				{/each}
			</select>
			<input bind:value={$search} class="ml-2" placeholder='{localize("SEQUENCER.Database.Search")}' type="text">
			<input bind:checked={allRanges} class="ml-2" id="database-all-ranges" type="checkbox">
			<label class="all-ranges-label" for="database-all-ranges">{localize("SEQUENCER.Database.ShowAllRanges")}</label>
		</div>

		<div class="sequencer-database-entries-container">

			<div class="sequencer-database-entries">
				<VirtualScroll
					data={filteredEntries}
					key="entry"
					let:data
				>
					<DatabaseEntry
						entry={data.entry}
						on:copy-db-path={() => copyPath(data.entry)}
						on:copy-file-path={() => copyPath(data.entry, true)}
						on:play={() => play(data.entry)}
						{searchRegex}
					/>
				</VirtualScroll>
			</div>

			<div class="sequencer-database-player-container">
				<video bind:this={player} autoplay class="database-player" height="335" preload width="335" loop
							 on:mouseenter={() => { player.controls = true; }}
							 on:mouseleave={() => { player.controls = false; }}
				>

				</video>
				<img bind:this={image} class="database-image hidden">
				<audio bind:this={audio} class="database-audio hidden"
							 on:mouseenter={() => { audio.controls = true; }}
							 on:mouseleave={() => { audio.controls = false; }}
				>
					<source type="audio/ogg">
				</audio>
				<div class="sequencer-database-metadata-container">
					{#if metadata}
						Type: {metadata.type} | Duration: {metadata.duration}
					{:else}
						No file loaded...
					{/if}
				</div>
			</div>

		</div>

	</div>

</ApplicationShell>

<style lang="scss">

  .sequencer-database {
    &-content {
      display: flex;
      flex-direction: column;
    }

    &-header {
      display: flex;
      flex-direction: row;

			> select {
        border-radius: 5px 0 0 5px;
				border-right: 0;
				height:28px;
			}

			> input[type="text"] {
        border-radius: 0 5px 5px 0;
				padding-left: 0.5rem;
        height:28px;
			}
    }

    &-entries-container {
      padding-top: 0.5rem;
      max-height: calc(420px - 5rem);
      display: flex;
    }

    &-entries {
      height: 339px;
      flex: 1;
      margin-right: 0.5rem;
    }

		&-player-container {
			display: flex;
			flex-direction: column;
      align-items: center;
      width: 335px;
      height: 335px;
			& > * {
        width: 320px;
        height: 320px;
				border-radius: 5px;
			}
		}

		&-metadata-container {
			text-align: center;
      margin-top: 5px;
			flex: 0;
		}
  }

  :global(.virtual-scroll-item) {
    padding: 2px;
    margin-right: 5px;
		border-radius: 4px;
  }

  :global(.virtual-scroll-item):nth-child(odd) {
    background-color: rgba(0,0,0,0.1);
  }

	.hidden {
		display:none;
	}

  .database-player-container {
    padding: 5px;
    width: 355px;
    height: 355px;
  }

  .database-player{
    background-color: #999999;
    padding:10px;
  }

  .database-image{
    width: 355px;
  }

  .database-audio{
    width: 355px;
    position: absolute;
    bottom: 0;
  }

</style>
