<script>

  import SequencerAudioHelper from "../../../modules/sequencer-audio-helper.js";

  export let id;
  export let sound;

  function endSound(){
    SequencerAudioHelper.stop([id], true);
	}

</script>


<div class="effect hover-highlight">
	<button class="btn_end" type="button" on:click={endSound}>
		<i class="fas fa-times"></i>
	</button>
	<div class="effect-text hover-text">
		{sound.src.split("/").slice(-1)}
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
