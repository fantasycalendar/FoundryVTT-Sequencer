<script>
  import { localize } from '#runtime/svelte/helper';
  import { PlayerSettings } from "./effect-player-store.js";
  import { get } from "svelte/store";
  import SequencerDatabase from "../../modules/sequencer-database.js";
  import SliderInput from "./components/SliderInput.svelte";
  import Checkbox from "./components/Checkbox.svelte";
  import NumberInput from "./components/NumberInput.svelte";
  import SwitchToggle from "./components/SwitchToggle.svelte";

  const fileStore = PlayerSettings.file.store;
  const users = game.users.filter(user => user.active);
  const userStore = PlayerSettings.users.store;

  let lastInput = "";
  let lastResults = [];
  let suggestions = [];
  const searchDebounce = foundry.utils.debounce(() => {
    const fileInput = get(fileStore).toLowerCase();
    if(!fileInput){
      suggestions = SequencerDatabase.publicModules;
      return;
		}
    if (lastInput === fileInput) return;
    let results = SequencerDatabase.searchFor(fileInput);
    if (lastResults.equals(results)) return;
    lastResults = foundry.utils.duplicate(results);
    if (results.length === 1 && results[0].startsWith(fileInput)) return;
    if (results.length > 100) {
      results = results.slice(0, 100);
    }
    suggestions = foundry.utils.duplicate(results);
  }, 200);

  $: searchDebounce($fileStore);

  async function activateLayer(){
    ui.controls.initialize({ control: "sequencer", tool: "play-effect" });
    canvas.sequencerInterfaceLayer.activate({ tool: "play-effect" });
	}

  let filePicker = false;

  function handleClick() {
    if (!filePicker) {
      const file = get(fileStore);
      const current = SequencerDatabase.getEntry(file, { softFail: true })
        ? file
        : "";
      filePicker = new FilePicker({
        type: "imageVideo",
        current,
        callback: path => {
          fileStore.set(path);
          filePicker = false;
        }
      });
    }
    filePicker.render(true, { focus: true });
  }

  const presets = PlayerSettings.getPresets();
  let selectedPreset = "default";

</script>

<div class="effect-player-container">

	<fieldset>

		<legend>Effect</legend>

		<button class="activate-layer" type="button" on:click={() => activateLayer()}>{localize("SEQUENCER.Player.SwitchToLayer")}</button>

		<div class="file-settings">
			<input bind:value={$fileStore} class="file-input flex3"
             list="dblist"
						 placeholder='{localize("SEQUENCER.Player.PathInput")}'
						 type="text"/>
			<button class="custom-file-picker small-button" type="button" on:click={handleClick}>
        <i class="fas fa-file-import"></i>
      </button>
			<datalist id="dblist">
				{#each suggestions as suggestion}
					<option>{suggestion}</option>
				{/each}
			</datalist>
		</div>

		<div class="user-settings flexcol">
			<label for="user-select">Play for users:</label>
			<select class="user-select" id="user-select" multiple bind:value={$userStore}>
				<option selected value="all">{localize("SEQUENCER.Player.AllUsers")}</option>
				{#each users as user (user.id)}
					<option value="{user.id}">{user.name}</option>
				{/each}
			</select>
		</div>

		<div class="flexcol">

			<div class="row w-100">{localize("SEQUENCER.Player.Presets")}</div>

			<div class="preset-container">

				<select class="preset-select" bind:value={selectedPreset} on:change={() => PlayerSettings.loadPreset(selectedPreset)}>

					<option value="default">{localize("SEQUENCER.Player.PresetsDefault")}</option>
					{#each presets as preset}
						<option>{preset}</option>
					{/each}
					<!--{{#each presets}}-->
					<!--<option>{{ @key }}</option>-->
					<!--{{/each}}-->

				</select>

				<button class="save-preset small-button" data-tooltip="Save Preset" type="button" on:click={() => PlayerSettings.savePreset(selectedPreset)}>
					<i class="fas fa-download"></i>
				</button>
				<button class="copy-preset small-button" data-tooltip="Copy Preset" disabled={selectedPreset === "default"} type="button" on:click={() => PlayerSettings.copyPreset(selectedPreset)}>
					<i class="fas fa-copy"></i>
				</button>
				<button class="delete-preset small-button" data-tooltip="Delete Preset" disabled={selectedPreset === "default"} type="button" on:click={() => PlayerSettings.deletePreset(selectedPreset)}>
					<i class="fas fa-times"></i>
				</button>

			</div>

		</div>

	</fieldset>

	<fieldset>

		<legend>Transform</legend>

		<div class="effect-transform-container">
			<SliderInput setting={PlayerSettings.scale} styles={{ "grid-column": `1 / 5` }}/>
			<NumberInput setting={PlayerSettings.scaleIn} styles={{ "grid-column": `1 / 3` }}/>
			<NumberInput setting={PlayerSettings.scaleOut} styles={{ "grid-column": `3 / 5` }}/>
			<div class="divider"></div>
			<SliderInput setting={PlayerSettings.rotation} lock={PlayerSettings.randomRotation} min="-180" max="180"  styles={{ "grid-column": `1 / 5` }}/>
			<div></div>
			<Checkbox setting={PlayerSettings.randomRotation} styles={{ "grid-column": `2 / 4` }}/>
			<div></div>
			<div class="divider"></div>
			<Checkbox setting={PlayerSettings.mirrorX} styles={{ "grid-column": `1 / 3` }}/>
			<Checkbox setting={PlayerSettings.mirrorY} styles={{ "grid-column": `3 / 5` }}/>
			<Checkbox setting={PlayerSettings.randomMirrorX} styles={{ "grid-column": `1 / 3` }} lock={PlayerSettings.mirrorX} inverse/>
			<Checkbox setting={PlayerSettings.randomMirrorY} styles={{ "grid-column": `3 / 5` }} lock={PlayerSettings.mirrorY} inverse/>
			<div class="divider"></div>
			<NumberInput setting={PlayerSettings.offsetX} lock={PlayerSettings.randomOffset} styles={{ "grid-column": `1 / 3` }}/>
			<NumberInput setting={PlayerSettings.offsetY} lock={PlayerSettings.randomOffset} styles={{ "grid-column": `3 / 5` }}/>
			<Checkbox setting={PlayerSettings.randomOffset} styles={{ "grid-column": `1 / 3` }}/>
			<NumberInput setting={PlayerSettings.randomOffsetAmount} lock={PlayerSettings.randomOffset} inverse styles={{ "grid-column": `3 / 5` }}/>
			<Checkbox setting={PlayerSettings.offsetGridUnits} styles={{ "grid-column": `2 / 5` }}/>
			<div></div>
		</div>

	</fieldset>

	<fieldset>

		<legend>Behavior</legend>
		<div class="effect-transform-container">
			<NumberInput setting={PlayerSettings.fadeIn} styles={{ "grid-column": `1 / 3` }}/>
			<NumberInput setting={PlayerSettings.fadeOut} styles={{ "grid-column": `3 / 5` }}/>
			<div class="divider"></div>
			<Checkbox setting={PlayerSettings.repeat} styles={{ "grid-column": `1 / 3` }}/>
			<NumberInput setting={PlayerSettings.repetitions} lock={PlayerSettings.repeat} inverse styles={{ "grid-column": `3 / 5` }}/>
			<NumberInput setting={PlayerSettings.repeatDelayMin} lock={PlayerSettings.repeat} inverse styles={{ "grid-column": `3 / 4` }}/>
			<NumberInput setting={PlayerSettings.repeatDelayMax} lock={PlayerSettings.repeat} inverse styles={{ "grid-column": `4 / 5` }}/>
			<div class="divider"></div>
			<SwitchToggle setting={PlayerSettings.moveTowards} styles={{ "grid-column": `1 / 3` }}/>
			<NumberInput setting={PlayerSettings.moveSpeed} lock={PlayerSettings.moveTowards} inverse styles={{ "grid-column": `3 / 5` }}/>
			<div class="divider"></div>
			<Checkbox setting={PlayerSettings.attachTo} styles={{ "grid-column": `1 / 5` }}/>
			<Checkbox setting={PlayerSettings.stretchToAttach} styles={{ "grid-column": `1 / 5` }}/>
			<Checkbox setting={PlayerSettings.snapToGrid} styles={{ "grid-column": `1 / 5` }}/>
			<Checkbox setting={PlayerSettings.persist} styles={{ "grid-column": `1 / 5` }}/>
			<Checkbox setting={PlayerSettings.belowTokens} styles={{ "grid-column": `1 / 5` }}/>
		</div>

	</fieldset>

</div>

<style lang="scss">

	.activate-layer {
		margin-bottom: 0.5rem;
	}

	.file-settings {
		display: flex;
    margin-bottom: 0.5rem;
	}

	.preset-container {
		display: flex;
    margin-bottom: 0.5rem;

		select {
			flex: 1;
    }
	}

  .small-button {
    flex: 0 0 24px;
    min-width: 30px;
    line-height: 24px;
    margin: -1px 0 -1px 4px;
    order: 99;
    text-align: center;

    i {
      margin: 0;
    }

    &:disabled {
      cursor: initial;
      opacity: 0.5;
    }

  }

	.user-settings {
    margin-bottom: 0.5rem;
	}

  .scrolling-text {

  }

  /* jb2a.breath_weapons02.burst.cone.arcana */

</style>
