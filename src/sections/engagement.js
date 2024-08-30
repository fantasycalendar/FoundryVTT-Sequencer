import * as lib from "../lib/lib.js";
import Section from "./section.js";
import SequencerFoundryReplicator from "../modules/sequencer-foundry-replicator.js";
import SequencerSoundManager from "../modules/sequencer-sound-manager.js";

export default class EngagementSection extends Section {
	constructor(inSequence, inSrc = null, inMaxWaitTime = null) {
		super(inSequence);
		this._waitUntilFinished = true;
		this._sound = inSrc;
		this._maxWaitTime = inMaxWaitTime;
	}

	static niceName = "Engagement";

	/**
	 * @returns {Promise<void>}
	 */
	async run() {
		lib.debug("Running engagement");
		let soundFile = await SequencerSoundManager.AudioHelper.preloadSound(this._sound);
		if(!soundFile) return;
		await SequencerFoundryReplicator._waitForEngagement(this._sound, this._maxWaitTime);
	}

	/**
	 * @returns {Promise}
	 * @private
	 */
	async _execute() {
		await this.run();
	}
}
