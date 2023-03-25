<script>
  import { localize } from '@typhonjs-fvtt/runtime/svelte/helper';
  import { PlayerSettings } from "./effect-player-store.js";
  import { get } from "svelte/store";
  import SequencerDatabase from "../../modules/sequencer-database.js";
  import SliderInput from "./components/SliderInput.svelte";
  import Checkbox from "./components/Checkbox.svelte";
  import NumberInput from "./components/NumberInput.svelte";

  const fileStore = PlayerSettings.file.store;
  const users = game.users.filter(user => user.active);

  let lastInput = "";
  let lastResults = [];
  let suggestions = [];
  const searchDebounce = foundry.utils.debounce(() => {
    const fileInput = get(fileStore).toLowerCase();
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

</script>

<div class="effect-player-container">

	<fieldset>

		<legend>Effect</legend>

		<button class="activate-layer w-100 mb-2" type="button">{localize("SEQUENCER.Player.SwitchToLayer")}</button>

		<div class="file-settings flexcol mb-2">
			<div class="row">
				<input bind:value={$fileStore} class="file-input flex3" list="dblist"
							 placeholder='{localize("SEQUENCER.Player.PathInput")}'
							 type="text">
				<button class="custom-file-picker small-button" type="button"><i class="fas fa-file-import"></i></button>
			</div>
			<datalist id="dblist">
				{#each suggestions as suggestion}
					<option>{suggestion}</option>
				{/each}
			</datalist>
		</div>

		<div class="user-settings flexcol mb-2">
			<label for="user-select">Play for users:</label>
			<select class="user-select" id="user-select" multiple>
				<option selected value="all">{localize("SEQUENCER.Player.AllUsers")}</option>
				{#each users as user (user.id)}
					<option value="{user.id}">{user.name}</option>
				{/each}
			</select>
		</div>

		<div class="flexcol">

			<div class="row w-100">{localize("SEQUENCER.Player.Presets")}</div>

			<div class="row w-100">

				<select class="preset-select flex-grow">

					<option value="default">{localize("SEQUENCER.Player.PresetsDefault")}</option>
					<!--{{#each presets}}-->
					<!--<option>{{ @key }}</option>-->
					<!--{{/each}}-->

				</select>

				<button class="save-preset flex-shrink small-button" type="button">
					<i class="fas fa-download"></i>
				</button>
				<button class="copy-preset flex-shrink small-button" disabled type="button">
					<i class="fas fa-copy"></i>
				</button>
				<button class="delete-preset flex-shrink small-button" disabled type="button">
					<i class="fas fa-times"></i>
				</button>

			</div>

		</div>

	</fieldset>

	<fieldset>

		<legend>Transform</legend>

		<div class="effect-transform-container">
			<SliderInput setting={PlayerSettings.scale}/>
			<NumberInput setting={PlayerSettings.scaleIn}/>
			<NumberInput setting={PlayerSettings.scaleOut}/>
			<div class="divider"></div>
			<SliderInput setting={PlayerSettings.rotation} lock={PlayerSettings.randomRotation} min="-180" max="180"/>
			<div></div>
			<Checkbox setting={PlayerSettings.randomRotation} styles={{ "grid-column": `2 / 4` }}/>
			<div></div>
			<div class="divider"></div>
			<Checkbox setting={PlayerSettings.mirrorX} styles={{ "grid-column": `1 / 3` }}/>
			<Checkbox setting={PlayerSettings.mirrorY} styles={{ "grid-column": `3 / 5` }}/>
			<Checkbox setting={PlayerSettings.randomMirrorX} styles={{ "grid-column": `1 / 3` }} lock={PlayerSettings.mirrorX} inverse/>
			<Checkbox setting={PlayerSettings.randomMirrorY} styles={{ "grid-column": `3 / 5` }} lock={PlayerSettings.mirrorX} inverse/>
			<div class="divider"></div>
			<NumberInput setting={PlayerSettings.offsetX}/>
			<NumberInput setting={PlayerSettings.offsetY}/>
			<Checkbox setting={PlayerSettings.randomOffsetX} styles={{ "grid-column": `1 / 3` }}/>
			<Checkbox setting={PlayerSettings.randomOffsetY} styles={{ "grid-column": `3 / 5` }}/>
			<div></div>
			<Checkbox setting={PlayerSettings.offsetGridUnits} styles={{ "grid-column": `2 / 4` }}/>
			<div></div>
		</div>

	</fieldset>

	<fieldset>

		<legend>Behavior</legend>
		<div class="effect-transform-container">
			<NumberInput setting={PlayerSettings.fadeIn}/>
			<NumberInput setting={PlayerSettings.fadeOut}/>
			<div class="divider"></div>
			<Checkbox setting={PlayerSettings.repeat} styles={{ "grid-column": `1 / 3` }}/>
			<NumberInput setting={PlayerSettings.repetitions} lock={PlayerSettings.repeat} inverse/>
			<NumberInput setting={PlayerSettings.repeatDelayMin} lock={PlayerSettings.repeat} inverse/>
			<NumberInput setting={PlayerSettings.repeatDelayMax} lock={PlayerSettings.repeat} inverse/>
			<div></div>
			<Checkbox setting={PlayerSettings.snapToGrid} styles={{ "grid-column": `1 / 3` }}/>
		</div>

	</fieldset>

</div>
