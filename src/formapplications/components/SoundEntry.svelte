<script>

	import { SelectionManager } from "../../modules/sequencer-interaction-manager.js";

	let localize = game.i18n.localize.bind(game.i18n);
	import SequencerSoundManager from "../../modules/sequencer-sound-manager.js";

	export let sound;


	function getSoundName(sound) {

		let soundName = "";
		if (sound.data.file && typeof sound.data.file === "string") {
			soundName = sound.data.file.split('\\').pop().split('/').pop();
		} else if (sound.data.file && typeof sound.data.file === "object") {
			soundName = Object.values(sound.data.file)[0].split('\\').pop().split('/').pop();
		} else if (sound.data.text) {
			soundName = "Text: " + sound.data.text.text;
		} else {
			soundName =  sound.data?.shapes?.[0]?.type ? "Shape: " + sound.data.shapes[0]?.type : "Unknown sound"
		}

		soundName = sound.data.name ? `${sound.data.name} (${soundName})` : soundName;

		if (sound.data.creatorUserId !== game.userId) {
			let user_name = game.users.get(sound.data.creatorUserId)?.name;
			let formattedUsername = (user_name
				? localize("SEQUENCER.ManagerPlayersSound", { user_name })
				: localize("SEQUENCER.ManagerUnknownSound"));
			soundName += ` (${formattedUsername})`;
		}

		return soundName;

	}

	function mouseOver() {
		SelectionManager.hoveredSoundUI = sound;
	}

	function mouseLeave() {
		SelectionManager.hoveredSoundUI = false;
	}

	function endSound() {
		SelectionManager.hoveredSoundUI = false;
		SequencerSoundManager.endSounds({ sounds: [sound.id] }, true);
	}

</script>


<div class="sound hover-highlight" on:mouseleave={mouseLeave} on:mouseover={mouseOver}>
	<button class="btn_end" on:click={endSound} type="button">
		<i class="fas fa-times"></i>
	</button>
	<div class="sound-text hover-text">
		{getSoundName(sound)}
	</div>
</div>


<style lang="scss">

  .sound {
    display: flex;
    flex: 1 0 auto;
  }

  .sound > button {
    flex: 0;
    font-size: 0.7rem;
    height: 1.25rem;
    line-height: normal;
    margin-right: 5px;
  }

  .btn_end {
    min-width: 1.5rem;
  }

  .sound > div {
    flex: 1;
    line-height: 1.25rem;
  }

  .hover-highlight:hover > .hover-text {
    color: #000;
    text-shadow: 0 0 10px red;
  }

</style>
