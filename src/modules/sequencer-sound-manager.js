import { sequencerSocket, SOCKET_HANDLERS } from "../sockets.js";
import SequencerAnimationEngine from "./sequencer-animation-engine.js";
import * as lib from "../lib/lib.js";
import SequenceManager from "./sequence-manager.js";
import { EffectsUIApp } from "../formapplications/effects-ui/effects-ui-app.js";
import * as canvaslib from "../lib/canvas-lib.js";
import { SequencerFileBase } from "./sequencer-file.js";


function updateSoundPosition(sound, data, position) {
	let volume = data.volume ?? 0.8;
	let {
		easing = true,
		walls = false,
		gmAlways = false,
		sourceData = {},
		radius = 1,
		muffledEffect = { type: "lowpass", intensity: 5 }
	} = data.locationOptions ?? {};

	const source = new CONFIG.Canvas.soundSourceClass({ object: null });
	source.initialize({
		x: position.x,
		y: position.y,
		elevation: position.elevation ?? 0,
		radius: canvas.dimensions.distancePixels * radius,
		walls,
		...sourceData
	});

	const config = { sound, source, listener: undefined, volume: 0, walls, muffled: false };

	// Configure playback volume using the closest listener position
	const listeners = (gmAlways && game.user.isGM) ? [position] : canvas.sounds.getListenerPositions();
	for (const l of listeners) {
		const v = volume * source.getVolumeMultiplier(l, { easing });
		Object.assign(config, { listener: l, volume: v });
	}
	canvas.sounds._configurePlayback(config);

	let hasMuffledEffect = sound.effects.findIndex(e => e.type === muffledEffect.type);

	if (hasMuffledEffect > -1 && !config.muffled) {
		sound.effects[hasMuffledEffect].disconnect();
		sound.effects.splice(hasMuffledEffect, 1);
		sound.applyEffects(sound.effects);
	} else if (hasMuffledEffect === -1 && config.muffled) {
		const sfx = CONFIG.soundEffects;
		let effect;
		if (config.muffled && (muffledEffect?.type in sfx)) {
			const muffledCfg = sfx[muffledEffect.type];
			effect = new muffledCfg.effectClass(sound.context, muffledEffect);
			sound.effects.push(effect);
		}
		sound.applyEffects(sound.effects);
	}

	sound.volume = config.volume * sound.volume_multiplier;
}

export default class SequencerSoundManager {

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

		data.volume = playSound ? (data.volume ?? 0.8) : 0.0;

		const twister = lib.createMersenneTwister(data.seed);

		let sourceLocation = data.source ? canvaslib.getPositionFromData(data, "source", twister) : false;
		let targetLocation = data.target ? canvaslib.getPositionFromData(data, "target", twister) : false;

		let file;
		if (Sequencer.Database.entryExists(data.src)) {
			file = Sequencer.Database.getEntry(data.src).clone();
		} else {
			file = SequencerFileBase.make(data.src);
		}

		if (lib.is_real_number(data.forcedIndex)) {
			file.fileIndex = data.forcedIndex;
		}

		if (sourceLocation && targetLocation && file.rangeFind) {
			let distance = (new foundry.canvas.geometry.Ray(sourceLocation, targetLocation)).distance;
			file = file.getFileForDistance(distance);
		} else {
			file = file.getFile();
		}

		let placedOnCanvas = data.source && !data.global;

		let sound = new foundry.audio.Sound(file, {
			context: placedOnCanvas ? game.audio.environment : game.audio.interface
		});
		await sound.load();

		if (placedOnCanvas) {
			sound.playAtPosition(sourceLocation, data.locationOptions?.radius || 1, {
				easing: true,
				walls: false,
				gmAlways: false,
				radius: 1,
				muffledEffect: { type: "lowpass", intensity: 5 },
				...data.locationOptions,
				loopStart: data.startTime,
				loopEnd: data.endTime,
				volume: data.volume,
				offset: data.startTime,
				channel: data.channel || "interface"
			});
		} else {
			sound.play({
				...data.locationOptions,
				loopStart: data.startTime,
				loopEnd: data.endTime,
				volume: data.fadeIn ? 0 : data.volume,
				offset: data.startTime,
				context: game.audio[data.channel || "interface"]
			});
		}

		if (!sound) {
			return false;
		}

		let soundDuration = sound.duration * 1000;
		let duration = data.duration ?? soundDuration;

		sound.sequencer_data = data;
		sound.sound_id = data.id;
		sound.sound_playing = playSound || game.user.isGM;
		sound.loop = duration > soundDuration;
		sound.volume_multiplier = 1.0;
		sound.sound_location = sourceLocation;

		let updateSoundTickerFn = () => {
			let location = sound.sound_location;
			updateSoundPosition(sound, data, location);
			SequenceManager.VisualizedSounds.update(visualizedSounds => {
				visualizedSounds[data.id] = { ...data, location };
				return visualizedSounds;
			});
		}

		SequenceManager.RunningSounds.add(data.id, sound);
		if (placedOnCanvas && data?.locationOptions?.visualize && playSound) {
			SequenceManager.VisualizedSounds.add(data.id, { ...data, location: sourceLocation });
		}

		if (data.moveTowards && placedOnCanvas) {
			canvas.app.ticker.add(updateSoundTickerFn, data.id)

			SequencerAnimationEngine.addAnimation(data.id, {
				target: sound,
				propertyName: "sound_location.x",
				from: sourceLocation.x,
				to: targetLocation.x,
				duration: duration,
				ease: data.moveTowards.ease ?? "linear",
				delay: 0,
				absolute: true
			});

			SequencerAnimationEngine.addAnimation(data.id, {
				target: sound,
				propertyName: "sound_location.y",
				from: sourceLocation.y,
				to: targetLocation.y,
				duration: duration,
				ease: data.moveTowards.ease ?? "linear",
				delay: 0,
				absolute: true
			});

			if (playSound) {
				if (data.fadeIn) {
					sound.volume_multiplier = 0.0;
					SequencerAnimationEngine.addAnimation(data.id, {
						target: sound,
						propertyName: "volume_multiplier",
						from: 0.0,
						to: 1.0,
						duration: Math.min(data.fadeIn.duration, data.duration),
						ease: data.fadeIn.ease,
						delay: Math.min(data.fadeIn.delay, data.duration),
						absolute: true
					});
				}

				if (data.fadeOut) {
					SequencerAnimationEngine.addAnimation(data.id, {
						target: sound,
						propertyName: "volume_multiplier",
						from: 1.0,
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
			}

		} else if (playSound) {
			if (data.fadeIn) {
				SequencerAnimationEngine.addAnimation(data.id, {
					target: sound,
					propertyName: "volume",
					from: 0.0,
					to: 1.0,
					duration: Math.min(data.fadeIn.duration, data.duration),
					ease: data.fadeIn.ease,
					delay: Math.min(data.fadeIn.delay, data.duration),
					absolute: true
				});
			}

			if (data.fadeOut) {
				SequencerAnimationEngine.addAnimation(data.id, {
					target: sound,
					propertyName: "volume",
					from: 1.0,
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
		}

		sound.volume = data.volume * sound.volume_multiplier;

		new Promise((resolve) => {
			sound.addEventListener("stop", resolve);
			sound.addEventListener("end", resolve);
			if (duration) {
				setTimeout(() => {
					sound.stop();
					resolve();
				}, duration);
			}
		}).then(() => {
			SequenceManager.RunningSounds.delete(data.id);
			SequenceManager.VisualizedSounds.delete(data.id);
			canvas.app.ticker.remove(updateSoundTickerFn, data.id)
			Hooks.callAll("endedSequencerSound", data);
		});

		return duration;
	}

	static _validateFilters(inFilter) {

		if (inFilter?.sounds) {
			if (!Array.isArray(inFilter.sounds)) {
				inFilter.sounds = [inFilter.sounds];
			}
			inFilter.sounds = inFilter.sounds.map((sound) => {
				if (!(typeof sound === "string" || sound instanceof foundry?.audio?.Sound))
					throw lib.custom_error(
						"Sequencer",
						"SoundManager | collections in inFilter.sounds must be of type string or Sound",
					);
				if (sound instanceof foundry?.audio?.Sound) return sound.sequencer_data.id;
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
