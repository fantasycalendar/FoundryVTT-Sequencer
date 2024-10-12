import { sequencerSocket, SOCKET_HANDLERS } from "../sockets.js";
import SequencerAnimationEngine from "./sequencer-animation-engine.js";
import * as lib from "../lib/lib.js";
import SequenceManager from "./sequence-manager.js";
import { EffectsUIApp } from "../formapplications/effects-ui/effects-ui-app.js";
import * as canvaslib from "../lib/canvas-lib.js";
import CONSTANTS from "../constants.js";


function createSoundListener(sound, name, func) {
	if (CONSTANTS.IS_V12) {
		return sound.addEventListener(name, func);
	}
	return sound.on(name, func);
}


export default class SequencerSoundManager {

	static AudioHelper = foundry?.audio?.AudioHelper ?? AudioHelper;
	static Sound = foundry?.audio?.Sound ?? Sound;

	/**
	 * Returns all the currently running sounds
	 *
	 * @returns {Array}
	 */
	static get sounds() {
		return Array.from(SequenceManager.RunningSounds.values());
	}

	/**
	 * Opens the Sequencer Manager with the sounds tab open
	 */
	static show() {
		return EffectsUIApp.show({ tab: "manager" });
	}

	/**
	 * Play an audio file.
	 *
	 * @param {Object} data The data that describes the audio to play.
	 * @param {boolean} [push=false] A flag indicating whether to make other clients play the audio, too.
	 * @returns {Number} A promise that resolves when the audio file has finished playing.
	 */
	static async play(data, push = true) {
		if (push)
			sequencerSocket.executeForOthers(SOCKET_HANDLERS.PLAY_SOUND, data);
		return this._play(data);
	}

	/**
	 * @param {Object} data
	 * @returns {Number}
	 * @private
	 */
	static async _play(data) {

		if (data.delete) return false;

		Hooks.callAll("createSequencerSound", data);

		lib.debug(`Playing sound:`, data);

		const playSound = game.settings.get("sequencer", "soundsEnabled") &&
			game.user.viewedScene === data.sceneId &&
			(!data?.users?.length || data?.users?.includes(game.userId));

		// Sound in v11 was not multiplied correctly when played through the AudioHelper, but is in v12
		data.volume = playSound
			? (data.volume ?? 0.8) * (!CONSTANTS.IS_V12 ? game.settings.get("core", "globalInterfaceVolume") : 1.0)
			: 0.0;

		let sound;

		if (data.location) {
			let location =
				(lib.is_UUID(data.location) ? fromUuidSync(data.location) : null)
				?? { x: data.location?.x ?? 0, y: data.location?.x ?? 0 };
			if (data.offset) {
				location.x += data.offset.x * (data.offset.gridUnits ? canvas.grid.size : 1);
				location.y += data.offset.y * (data.offset.gridUnits ? canvas.grid.size : 1);
			}
			if (data.randomOffset?.source) {
				const twister = lib.createMersenneTwister(data.seed);
				location = canvaslib.get_random_offset(location, data.randomOffset.source, twister);
			}
			sound = await canvas.sounds.playAtPosition(data.src, location, data.locationOptions?.radius || 5, {
				gmAlways: false,
				walls: false,
				easing: true,
				muffledEffect: { type: "lowpass" },
				...data.locationOptions,
				volume: data.volume,
				channel: data.channel || "interface"
			});
		} else {
			sound = await this.AudioHelper.play({
				...data.locationOptions,
				src: data.src,
				volume: data.fadeIn ? 0 : data.volume,
				loop: data.loop,
				offset: data.startTime,
				channel: data.channel || "interface"
			}, false);
		}

		if (!sound) return false;

		sound.sequencer_data = data;
		sound.sound_id = data.id;
		sound.sound_playing = playSound || game.user.isGM;

		SequenceManager.RunningSounds.add(data.id, sound);

		if (data.fadeIn && playSound) {
			SequencerAnimationEngine.addAnimation(data.id, {
				target: sound,
				propertyName: "volume",
				from: 0.0,
				to: data.volume,
				duration: Math.min(data.fadeIn.duration, data.duration),
				ease: data.fadeIn.ease,
				delay: Math.min(data.fadeIn.delay, data.duration),
				absolute: true
			});
		}

		if (data.fadeOut && playSound) {
			SequencerAnimationEngine.addAnimation(data.id, {
				target: sound,
				propertyName: "volume",
				from: data.volume,
				to: 0.0,
				duration: Math.min(data.fadeOut.duration, data.duration),
				ease: data.fadeOut.ease,
				delay: Math.max(
					data.duration - data.fadeOut.duration + data.fadeOut.delay,
					0,
				),
				absolute: true
			});
		}

		if (data.duration) {
			setTimeout(() => {
				sound.stop();
			}, data.duration);
		}

		new Promise((resolve) => {
			createSoundListener(sound, "stop", resolve);
			createSoundListener(sound, "end", resolve);
		}).then(() => {
			SequenceManager.RunningSounds.delete(data.id);
			Hooks.callAll("endedSequencerSound", data);
		});

		return data.duration;
	}

	static _validateFilters(inFilter) {

		if (inFilter?.sounds) {
			if (!Array.isArray(inFilter.sounds)) {
				inFilter.sounds = [inFilter.sounds];
			}
			inFilter.sounds = inFilter.sounds.map((sound) => {
				if (!(typeof sound === "string" || sound instanceof SequencerSoundManager.Sound))
					throw lib.custom_error(
						"Sequencer",
						"SoundManager | collections in inFilter.sounds must be of type string or Sound",
					);
				if (sound instanceof SequencerSoundManager.Sound) return sound.sequencer_data.id;
				return sound;
			});
		}

		if (inFilter?.name && typeof inFilter?.name !== "string")
			throw lib.custom_error(
				"Sequencer",
				"SoundManager | inFilter.name must be of type string",
			);

		if (inFilter?.sceneId) {
			if (typeof inFilter.sceneId !== "string")
				throw lib.custom_error(
					"Sequencer",
					"SoundManager | inFilter.sceneId must be of type string",
				);
			if (!game.scenes.get(inFilter.sceneId))
				throw lib.custom_error(
					"Sequencer",
					"SoundManager | inFilter.sceneId must be a valid scene id (could not find scene)",
				);
		} else {
			inFilter.sceneId = game.user.viewedScene;
		}

		if (inFilter?.origin && typeof inFilter?.origin !== "string")
			throw lib.custom_error(
				"Sequencer",
				"SoundManager | inFilter.origin must be of type string",
			);

		if (
			!inFilter.sounds &&
			!inFilter.name &&
			!inFilter.sceneId &&
			!inFilter.origin
		) {
			return false;
		}

		return foundry.utils.mergeObject(
			{
				sounds: null,
				name: null,
				sceneId: null,
				origin: null,
			},
			inFilter,
		);
	}

	static _filterSounds(inFilter) {
		if (inFilter.name) {
			inFilter.name = new RegExp(
				"^" + lib.str_to_search_regex_str(lib.safe_str(inFilter.name)) + "$",
				"gu",
			);
		}
		return this.sounds.filter((sound) => {
			return (
				(inFilter.sounds === null || inFilter.sounds.includes(sound.sequencer_data.id)) &&
				(inFilter.name === null || (sound.sequencer_data.name && inFilter.name && sound.sequencer_data.name.match(inFilter.name)?.length)) &&
				(inFilter.sceneId === null || (sound.sequencer_data.sceneId === inFilter.sceneId)) &&
				(inFilter.origin === null || inFilter.origin === sound.sequencer_data.origin)
			)
		});
	}

	static getSounds(inFilter = {}) {
		const filters = this._validateFilters(inFilter);
		if (!inFilter)
			throw lib.custom_error(
				"Sequencer",
				"SoundManager | getSounds | Incorrect or incomplete parameters provided",
			);
		return this._filterSounds(filters);
	}

	static stop(ids) {
		lib.custom_warning(
			"Sequencer",
			"SoundManager | stop | This method is becoming deprecated, please use Sequencer.SoundManager.endSounds instead",
			false,
		);
		return this.endSounds({ sounds: ids });
	}

	static endSounds(inFilter, push = true) {
		const filters = this._validateFilters(inFilter);
		const sounds = this._filterSounds(filters);
		if (!sounds?.length) return;
		const ids = sounds.map(sound => sound.sequencer_data.id);
		if (push && game.user.isGM) {
			sequencerSocket.executeForOthers(SOCKET_HANDLERS.END_SOUNDS, ids);
		}
		return this._endSounds(ids);
	}

	/**
	 * @param ids
	 * @private
	 */
	static _endSounds(ids) {
		for (const id of ids) {
			const sound = SequenceManager.RunningSounds.get(id);
			if (sound) {
				sound.stop();
			}
		}
	}

	static endAllSounds(push = true) {
		const ids = SequenceManager.RunningSounds.keys();
		if (push && game.user.isGM) {
			sequencerSocket.executeForOthers(SOCKET_HANDLERS.END_SOUNDS, ids);
		}
		return this._endSounds(ids);
	}
}
