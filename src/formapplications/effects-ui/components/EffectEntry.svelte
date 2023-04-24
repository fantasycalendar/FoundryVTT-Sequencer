<script>

  import { localize } from '@typhonjs-fvtt/runtime/svelte/helper';
  import { SelectionManager } from "../../../modules/sequencer-interaction-manager.js";
  import SequencerEffectManager from "../../../modules/sequencer-effect-manager.js";

  export let effect;

  function getEffectName(effect) {

    let effectName = "Unknown effect";
    if (effect.data.file) {
      effectName = effect.data.file.split('\\').pop().split('/').pop();
    } else if (effect.data.text) {
      effectName = "Text: " + effect.data.text.text;
    } else {
      effectName = "Shape: " + effect.data.shapes[0].type
    }

    effectName = effect.data.name ? `${effect.data.name} (${effectName})` : effectName;

    if (effect.data.creatorUserId !== game.userId) {
      let user_name = game.users.get(effect.data.creatorUserId)?.name;
      let formattedUsername = (user_name
        ? localize("SEQUENCER.ManagerPlayersEffect", { user_name })
        : localize("SEQUENCER.ManagerUnknownEffect"));
      effectName += ` (${formattedUsername})`;
    }

    return effectName;

  }

  function mouseOver() {
    SelectionManager.hoveredEffectUI = effect;
  }

  function mouseLeave() {
    SelectionManager.hoveredEffectUI = false;
  }

  function endEffect(){
    SequencerEffectManager.endEffects({ effects: [effect] });
	}

</script>


<div class="effect hover-highlight" on:mouseleave={mouseLeave} on:mouseover={mouseOver}>
	<button class="btn_end" type="button" on:click={endEffect}>
		<i class="fas fa-times"></i>
	</button>
	<div class="effect-text hover-text">
		{getEffectName(effect)}
	</div>
</div>


<style lang="scss">

  .effect {
    display: flex;
    flex: 1 0 auto;
  }

  .effect > button {
    flex: 0;
    font-size: 0.7rem;
    height: 1.25rem;
    line-height: normal;
    margin-right: 5px;
  }

  .btn_end {
    min-width: 1.5rem;
  }

  .effect > div {
    flex: 1;
    line-height: 1.25rem;
  }

  .hover-highlight:hover > .hover-text {
    color: #000;
    text-shadow: 0 0 10px red;
  }

</style>
