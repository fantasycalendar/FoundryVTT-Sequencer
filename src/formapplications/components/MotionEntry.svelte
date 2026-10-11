<script>

  let localize = game.i18n.localize.bind(game.i18n);
  import SequencerMotionManager from "../../modules/sequencer-motion-manager.js";

  export let motion;

  function getMotionName(motion) {

    const baseName = motion.data.name ?? "Motion";

    let targetDescription = "";
    if (motion.data.uuid) {
      const target = fromUuidSync(motion.data.uuid);
      const targetName = target?.name ?? motion.data.uuid;
      targetDescription = ` on ${targetName}`;
    }

    let result = `${baseName}${targetDescription}`;

    if (motion.data.creatorUserId !== game.userId) {
      let user_name = game.users.get(motion.data.creatorUserId)?.name;
      let formattedUsername = (user_name
        ? localize("SEQUENCER.ManagerPlayersEffect", { user_name })
        : localize("SEQUENCER.ManagerUnknownEffect"));
      result += ` (${formattedUsername})`;
    }

    return result;

  }

  function endMotion() {
    SequencerMotionManager.endMotions(motion.data.uuid, {
      name: motion.data.name,
      sequenceId: motion.data.sequenceId,
    });
  }

</script>


<div class="effect hover-highlight">
	<button class="btn_end" type="button" on:click={endMotion}>
		<i class="fas fa-times"></i>
	</button>
	<div class="effect-text hover-text">
		{getMotionName(motion)}
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
