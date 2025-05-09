import * as lib from "../lib/lib.js";
import FunctionSection from "../sections/func.js";
import EffectSection from "../sections/effect.js";
import SoundSection from "../sections/sound.js";
import AnimationSection from "../sections/animation.js";
import Section from "../sections/section.js";
import SequencerPresets from "./sequencer-presets.js";
import ScrollingTextSection from "../sections/scrollingText.js";
import { sequencerSocket, SOCKET_HANDLERS } from "../sockets.js";
import CanvasPanSection from "../sections/canvasPan.js";
import SequenceManager from "./sequence-manager.js";
import { get, writable } from "svelte/store";
import CONSTANTS from "../constants.js";
import WaitSection from "../sections/wait.js";
import CrosshairSection from "../sections/crosshair.js";
import { get_object_canvas_data } from "../lib/canvas-lib.js";
import CrosshairsPlaceable from "./sequencer-crosshair/CrosshairsPlaceable.js";
import CrosshairsDocument from "./sequencer-crosshair/CrosshairsDocument.js";
import FoundryShim from "../utils/foundry-shim.js";

export default class Sequence {
	constructor(
		options = {
			moduleName: "Sequencer",
			softFail: false,
		},
		softFail = false
	) {
		this.id = foundry.utils.randomID();
		this.moduleName =
			typeof options === "string"
				? options
				: options?.moduleName ?? "Sequencer";
		this.softFail = options?.softFail ?? softFail;
		this.sections = [];
		this.nameOffsetMap = false;
		this.crosshairs = {}
		this.effectIndex = 0;
		this.sectionToCreate = undefined;
		this.localOnly = false;
		this._status = writable(CONSTANTS.STATUS.READY);
		return lib.sequence_proxy_wrap(this);
	}

	/**
	 * Plays all of this sequence's sections
	 *
	 * @returns {Promise}
	 */
	async play({ remote = false, preload = false, local = false } = {}) {
		this.localOnly = local || remote;
		if (remote) {
			const data = await this.toJSON();
			sequencerSocket.executeForOthers(
				SOCKET_HANDLERS.RUN_SEQUENCE_LOCALLY,
				data
			);
			return new Sequence().fromJSON(data).play();
		}
		Hooks.callAll("createSequencerSequence", this);
		lib.debug("Initializing sections");
		const initializationPromises = this.sections.map((section) => section._initialize())
		await Promise.allSettled(initializationPromises)
		if (preload) {
			const preloadFiles = this.sections.filter(section => !!section._file).map(section => section._file)
			if(local) {
				await Sequencer.Preloader.preload(preloadFiles)
			}else {
				await Sequencer.Preloader.preloadForClients(preloadFiles)
			}
		}
		SequenceManager.RunningSequences.add(this.id, this);
		this.effectIndex = 0;
		lib.debug("Playing sections");
		this.status = CONSTANTS.STATUS.RUNNING;
		const promises = [];
		for (let section of this.sections) {
			if (section instanceof EffectSection) this.effectIndex++;
			if (section.shouldWaitUntilFinished) {
				promises.push(await section._execute());
			} else {
				promises.push(section._execute());
			}
			if (this.status === CONSTANTS.STATUS.ABORTED) {
				continue;
			}
			if (!section._isLastSection) {
				await new Promise((resolve) => setTimeout(resolve, 3));
			}
		}

		return Promise.allSettled(promises).then(() => {
			Hooks.callAll("endedSequencerSequence");
			lib.debug("Finished playing sections");
			this.status = CONSTANTS.STATUS.COMPLETE;
		});
	}

	/**
	 * Creates a section that will run a function.
	 *
	 * @param {function} inFunc
	 * @returns {Sequence} this
	 */
	thenDo(inFunc) {
		const func = lib.section_proxy_wrap(new FunctionSection(this, inFunc));
		this.sections.push(func);
		return func;
	}

	/**
	 * Creates a section that will run a macro based on a name or a direct reference to a macro.
	 *
	 * @param {string|Macro} inMacro
	 * @param {object} args
	 * @returns {Sequence} this
	 */
	macro(inMacro, ...args) {
		let macro;
		let compendium = false;
		if (typeof inMacro === "string") {
			if (inMacro.startsWith("Compendium")) {
				let packArray = inMacro.split(".");
				let pack = game.packs.get(`${packArray[1]}.${packArray[2]}`);
				// Catch invalid compendium pack
				if (!pack) {
					if (this.softFail) {
						return this;
					}
					throw lib.custom_error(
						this.moduleName,
						`macro - Compendium '${packArray[1]}.${packArray[2]}' was not found`
					);
				}
				macro = packArray;
				compendium = pack;
			} else {
				macro = game.macros.getName(inMacro);
				if (!macro) {
					if (this.softFail) {
						return this;
					}
					throw lib.custom_error(
						this.moduleName,
						`macro - Macro '${inMacro}' was not found`
					);
				}
			}
		} else if (inMacro instanceof Macro) {
			macro = inMacro;
		} else {
			throw lib.custom_error(
				this.moduleName,
				`macro - inMacro must be of instance string or Macro`
			);
		}

		args = args.length ? args?.[0] : {};
		if (typeof args !== "object") {
			throw lib.custom_error(
				this.moduleName,
				`macro - Secondary argument must be an object`
			);
		}

		const func = lib.section_proxy_wrap(
			new FunctionSection(
				this,
				async () => {
					if (compendium) {
						const macroIndex = (await compendium.getIndex())
							.find((i) => {
								if(macro[3] === "Macro"){
									return macro[4] === i._id;
								}
								return i.name === macro[3]
							});
						const macroData = macroIndex ? (await compendium.getDocument(macroIndex?._id)) : false;
						if (!macroData) {
							if (this.softFail) {
								return;
							}
							throw lib.custom_error(
								this.moduleName,
								`macro - Macro '${macro[3]}' was not found in compendium '${macro[1]}.${macro[2]}'`
							);
						}
						macro = new Macro(macroData);
						macro.ownership.default = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
					}

          await macro.execute(args);
        },
        true
      )
    );
    this.sections.push(func);
    return this;
  }

  /**
   * Creates an effect section. Until you call .then(), .effect(), .sound(), or .wait(), you'll be working on the Effect section.
   *
   * @param {string} [inFile] inFile
   * @returns {Section}
   */
  effect(inFile = "") {
    const effect = lib.section_proxy_wrap(new EffectSection(this, inFile));
    this.sections.push(effect);
    return effect;
  }

  /**
   * Creates a sound section. Until you call .then(), .effect(), .sound(), or .wait(), you'll be working on the Sound section.
   *
   * @param {string} [inFile] inFile
   * @returns {Section}
   */
  sound(inFile = "") {
    const sound = lib.section_proxy_wrap(new SoundSection(this, inFile));
    this.sections.push(sound);
    return sound;
  }

	/**
	 * Creates an animation. Until you call .then(), .effect(), .sound(), or .wait(), you'll be working on the Animation section.
	 *
	 * @param {Token|Tile} [inTarget=false] inTarget
	 * @returns {AnimationSection}
	 */
	animation(inTarget) {
		const animation = lib.section_proxy_wrap(
			new AnimationSection(this, inTarget)
		);
		this.sections.push(animation);
		return animation;
	}

	/**
	 * Creates a scrolling text. Until you call .then(), .effect(), .sound(), or .wait(), you'll be working on the Scrolling Text section.
	 *
	 * @param {Object|String|Boolean} [inTarget=false] inTarget
	 * @param {String|Boolean} [inText=false] inText
	 * @param {Object} [inTextOptions={}] inTextOptions
	 * @returns {AnimationSection}
	 */
	scrollingText(inTarget = false, inText = false, inTextOptions = {}) {
		const scrolling = lib.section_proxy_wrap(
			new ScrollingTextSection(this, inTarget, inText, inTextOptions)
		);
		this.sections.push(scrolling);
		return scrolling;
	}

	/**
	 * Pans the canvas text. Until you call any other sections you'll be working on the Canvas Pan section.
	 *
	 * @param {Object|String|Boolean} [inTarget=false] inTarget
	 * @param {Boolean|Number} inDuration
	 * @param {Boolean|Number} inSpeed
	 * @returns {AnimationSection}
	 */
	canvasPan(inTarget = false, inDuration = null, inSpeed = null) {
		const panning = lib.section_proxy_wrap(
			new CanvasPanSection(this, inTarget)
		);
		this.sections.push(panning);
		return panning;
	}

	/**
	 * Creates a crosshair section. Until you call other Sequence methods, you will be working on the Crosshair section.
	 *
	 * @param {string} [inName] inName
	 * @returns {Section}
	 */
	crosshair(inName = "") {
		const crosshair = lib.section_proxy_wrap(new CrosshairSection(this, inName));
		this.sections.push(crosshair);
		return crosshair;
	}

	/**
	 * Adds a location to the sequence and ties it to a string so that it may be used later
	 * @param {string} inName
	 * @param {object/PlaceableObject/Document} inLocation
	 * @returns {Sequence} this
	 */
	addNamedLocation(inName, inLocation){
		if (typeof inName !== "string")
			throw lib.custom_error(this.moduleName, `addNamedLocation - inName must be of type string`);
		if (!(typeof inLocation === "object" || inLocation instanceof FoundryShim.PlaceableObject || inLocation instanceof Document))
			throw lib.custom_error(this.moduleName, `addNamedLocation - inLocation must be of type object, PlaceableObject, or Document`);
		if(inLocation instanceof CrosshairsPlaceable) inLocation = inLocation.document;
		this.nameOffsetMap ||= {};

		const sourceLocation = inLocation?.source ?? inLocation?.cachedPosition?.source ?? (
			inLocation instanceof CrosshairsDocument
					? inLocation.getOrientation().source
					: get_object_canvas_data(inLocation, { uuid: false })
		)

		const targetLocation = inLocation?.target ?? inLocation?.cachedPosition?.target ?? (
			inLocation instanceof CrosshairsDocument
					? inLocation.getOrientation().target ?? sourceLocation
					: get_object_canvas_data(inLocation, { measure: true, uuid: false })
		)

		this.nameOffsetMap[inName] = {
			seed: `${inName}-${foundry.utils.randomID()}`,
			source: sourceLocation,
			target: targetLocation
		}

		return this;
	}

	/**
	 * Causes the sequence to wait after the last section for as many milliseconds as you pass to this method. If given
	 * a second number, a random wait time between the two given numbers will be generated.
	 *
	 * @param {number} [msMin=1] minMs
	 * @param {number} [msMax=1] maxMs
	 * @returns {Sequence} this
	 */
	wait(msMin = 1, msMax = 1) {
		if (msMin < 1)
			throw lib.custom_error(
				this.moduleName,
				`wait - Wait ms cannot be less than 1`
			);
		if (msMax < 1)
			throw lib.custom_error(
				this.moduleName,
				`wait - Max wait ms cannot be less than 1`
			);
		const section = lib.section_proxy_wrap(new WaitSection(this, msMin, msMax));
		this.sections.push(section);
		return this;
	}

	/**
	 * Applies a preset to the sequence
	 *
	 * @param {string} presetName
	 * @param {*} args
	 * @returns {Sequence|FunctionSection|EffectSection|AnimationSection|SoundSection}
	 */
	preset(presetName, ...args) {
		if (typeof presetName !== "string") {
			throw this._customError(this, "name", `inName must be of type string`);
		}
		const preset = SequencerPresets.get(presetName);
		if (!preset) {
			lib.custom_warning(
				"Sequencer",
				`preset | Could not find preset with name "${presetName}"`
			);
			return this;
		}
		const lastSection = this.sections[this.sections.length - 1] || this;
		return preset(lastSection, ...args);
	}

	/**
	 * Adds the sections from a given Sequence to this Sequence
	 *
	 * @param {Sequence|FunctionSection|EffectSection|AnimationSection|SoundSection} inSequence
	 * @returns {Sequence} this
	 */
	addSequence(inSequence) {
		if (inSequence instanceof Section) inSequence = inSequence.sequence;
		if (!(inSequence instanceof Sequence)) {
			throw lib.custom_error(
				this.moduleName,
				`addSequence - could not find the sequence from the given parameter`
			);
		}
		const newSections = inSequence.sections.map((section) => {
			const newSection = Object.assign(
				Object.create(Object.getPrototypeOf(section)),
				section
			);
			newSection.sequence = this;
			return newSection;
		});
		this.sections = this.sections.concat(newSections);
		return this;
	}

	async toJSON() {
		const data = {
			options: { moduleName: this.moduleName, softFail: this.softFail },
			sections: [],
		};
		for (const section of this.sections) {
			const sectionData = await section._serialize();
			if (!sectionData.type) {
				throw new Error(
					`Sequencer | toJson | ${section.constructor.name} does not support serialization!`
				);
			}
			data.sections.push(sectionData);
		}
		return data;
	}

	fromJSON(data) {
		this.moduleName = data.options.moduleName;
		this.softFail = data.options.softFail;
		this.localOnly = true;
		for (const section of data.sections) {
			this[section.type]()._deserialize(section);
		}
		return this;
	}

	_createCustomSection(...args) {
		const func = lib.section_proxy_wrap(
			new this.sectionToCreate(this, ...args)
		);
		this.sectionToCreate = undefined;
		this.sections.push(func);
		return func;
	}

	_showWarning(self, func, warning, notify = false) {
		lib.custom_warning(
			this.moduleName,
			`${self.constructor.name.replace("Section", "")} | ${func} - ${warning}`,
			notify
		);
	}

	_customError(self, func, error) {
		return lib.custom_error(
			this.moduleName,
			`${self.constructor.name.replace("Section", "")} | ${func} - ${error}`
		);
	}

	set status(inStatus) {
		this._status.update((currentStatus) => {
			if (
				currentStatus === CONSTANTS.STATUS.READY ||
				currentStatus === CONSTANTS.STATUS.RUNNING
			) {
				return inStatus;
			}
			return currentStatus;
		});
	}

	get status() {
		return get(this._status);
	}

	get statusStore() {
		return this._status;
	}

	_abort() {
		this.status = CONSTANTS.STATUS.ABORTED;
		for (const section of this.sections) {
			section._abortSection();
		}
	}
}
