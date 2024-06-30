import * as lib from "../lib/lib.js";

const SequencerAnimationEngine = {
	_animations: [],
	_debug: undefined,
	_deltas: [],

	ticker: false,
	dt: 0,

	isRunning: false,

	addAnimation(origin, attributes = [], timeDifference = 0) {
		if (!Array.isArray(attributes)) attributes = [attributes];

		return new Promise((resolve) => {
			this._animations.push({
				origin,
				attributes: attributes.map((attribute) => {
					attribute.targetId = lib.get_object_identifier(attribute.target) + "-" + attribute.propertyName;
					attribute.id = foundry.utils.randomID();
					attribute.started = false;
					attribute.initialized = false;
					attribute.finishing = false;
					attribute.complete = false;
					attribute.previousValue = null;
					attribute.progress = 0;
					attribute.value = 0;
					attribute.coreValue = 0;
					attribute.isFunkyProperty = attribute.propertyName.startsWith("scale.");

					attribute.duration = attribute.duration ?? 0;
					attribute.durationDone = timeDifference ?? 0;

					if (attribute?.looping) {
						attribute.loopDuration = attribute.loopDuration ?? attribute.duration ?? 0;
						attribute.loopDurationDone = timeDifference % attribute.loopDuration ?? 0;
						attribute.loops = attribute.loops ?? 0;
						attribute.loopsDone = Math.floor(
							attribute.durationDone / attribute.duration
						);
						attribute.index = attribute.loopsDone % attribute.values.length;
						attribute.nextIndex =
							(attribute.loopsDone + 1) % attribute.values.length;
						if (!attribute.pingPong && attribute.nextIndex === 0) {
							attribute.index = 0;
							attribute.nextIndex = 1;
						}
					}
					return attribute;
				}),
				complete: false,
				totalDt: timeDifference,
				resolve: resolve,
			});

			this._animations.sort((a, b) => {
				const aNumAbsolute = a.attributes.filter(attr => !attr.complete && attr.absolute).length;
				const bNumAbsolute = b.attributes.filter(attr => !attr.complete && attr.absolute).length;
				return bNumAbsolute - aNumAbsolute;
			});

			if (!this.ticker) {
				this.start();
			}

			lib.debug(`Added animations to Animation Engine`);
		});
	},

	endAnimations(target) {
		this._animations = this._animations.filter(
			(animation) => animation.origin !== target
		);
	},

	updateStartValues(target, propertyName) {
		const targetId = lib.get_object_identifier(target) + "-" + propertyName;
		if (!this._coreValues[targetId]) return;
		if (targetId in this._coreValues) {
			this._coreValues[targetId].value = lib.deep_get(target, propertyName);
			const delta = this._coreValues[targetId].value - this._storedValues[targetId].value;
			this._storedValues[targetId].value += delta;
		}
	},

	start() {
		if (!this.ticker) {
			lib.debug(`Animation Engine Started`);
			this.ticker = CanvasAnimation.ticker;
			this.ticker.add(this.nextFrame.bind(this));
		}
	},

	nextFrame() {
		if (this._animations.length === 0) {
			this._coreValues = {};
			return;
		}

		this._storedValues = {};

		this._animations.forEach((animation) => this._animate(animation));

		for (let delta of Object.values(this._storedValues)) {
			try {
				lib.deep_set(delta.target, delta.propertyName, delta.value);
			} catch (err) {
			}
		}

		this._animations = this._animations.filter((animation) => !animation.complete);

		for (const targetId of Object.keys(this._coreValues)) {
			if (
				this._animations.every((anim) => {
					return anim.attributes.every((attr) => {
						return attr.targetId === targetId && attr.complete;
					})
				})
			) {
				delete this._coreValues[targetId];
			}
		}
	},

	_coreValues: {},
	_storedValues: {},

	_animate(animation) {
		animation.totalDt += this.ticker.elapsedMS;

		animation.attributes.filter((attribute) => {
			return !attribute.complete && animation.totalDt >= attribute.delay;
		}).forEach((attr) => {
			this._animateAttribute(attr);
		})

		animation.complete = animation.attributes.filter((attribute) => !attribute.complete).length === 0;

		if (animation.complete) {
			animation.resolve();
		}
	},

	_animateAttribute(attribute) {

		if (!attribute.started) {
			if (this._coreValues[attribute.targetId] === undefined) {
				this._coreValues[attribute.targetId] = {
					id: attribute.id,
					value: lib.deep_get(attribute.target, attribute.propertyName)
				};
			}
			attribute.started = true;
		}

		if (this._storedValues[attribute.targetId] === undefined) {
			this._storedValues[attribute.targetId] = {
				value: this._coreValues[attribute.targetId].value,
				target: attribute.target,
				propertyName: attribute.propertyName
			};
		}

		if (attribute?.looping && attribute?.indefinite) {
			this._handleIndefiniteLoop(attribute);
		} else if (attribute?.looping) {
			this._handleLoops(attribute);
		} else {
			this._handleDefault(attribute);
		}

		// This is absolutely horrendous, but 50% of the time, it works 90% of the time.
		if (attribute.absolute) {
			this._coreValues[attribute.targetId].value = attribute.value;
			const delta = this._coreValues[attribute.targetId].value - this._storedValues[attribute.targetId].value;
			this._storedValues[attribute.targetId].value += delta;
		} else {
			if (attribute.isFunkyProperty) {
				const coreValue = this._coreValues[attribute.targetId].value;
				attribute.delta = (coreValue * attribute.value) - coreValue;
			} else {
				if (attribute.previousValue === null) {
					attribute.previousValue = this._coreValues[attribute.targetId].value;
				}
				attribute.delta = attribute.value - attribute.previousValue;
				attribute.previousValue = attribute.value;
				if(attribute.id === this._coreValues[attribute.targetId].id){
					this._coreValues[attribute.targetId].value = attribute.value;
				}
			}
			this._storedValues[attribute.targetId].value += attribute.delta;
		}

	},

	_handleBaseLoop(attribute) {
		if (!attribute.initialized) {
			if (attribute.values.length === 1) {
				attribute.values.unshift(this._coreValues[attribute.targetId].value);
			}
			attribute.initialized = true;
		}

		attribute.loopDurationDone += this.ticker.deltaMS;
		attribute.progress = attribute.loopDurationDone / attribute.loopDuration;

		attribute.value = lib.interpolate(
			attribute.values[attribute.index],
			attribute.values[attribute.nextIndex],
			attribute.progress,
			attribute.ease
		);

		if (attribute.progress >= 1.0) {
			attribute.loopDurationDone -= attribute.loopDuration;

			attribute.index = (attribute.index + 1) % attribute.values.length;
			attribute.nextIndex = (attribute.nextIndex + 1) % attribute.values.length;

			if (!attribute.pingPong && attribute.nextIndex === 0) {
				attribute.index = 0;
				attribute.nextIndex = 1;
			}

			attribute.loopsDone++;

			attribute.value = lib.interpolate(
				attribute.values[attribute.index],
				attribute.values[attribute.nextIndex],
				attribute.progress % 1.0,
				attribute.ease
			);
		}
	},

	_handleIndefiniteLoop(attribute) {
		return this._handleBaseLoop(attribute);
	},

	_handleLoops(attribute) {
		this._handleBaseLoop(attribute);

		attribute.durationDone += this.ticker.deltaMS;
		attribute.overallProgress = attribute.durationDone / attribute.duration;

		if (
			attribute.progress >= 1.0 &&
			attribute.loopsDone === attribute.loops * 2
		) {
			attribute.finishing = true;
			attribute.value = attribute.values[attribute.index];
		}

		if (attribute.overallProgress >= 1.0) {
			attribute.finishing = true;
		}
	},

	_handleDefault(attribute) {
		if (!attribute.initialized) {
			if (attribute.from === undefined) {
				attribute.from = this._coreValues[attribute.targetId].value;
			}
			attribute.initialized = true;
		}

		attribute.durationDone += this.ticker.deltaMS;
		attribute.progress = attribute.durationDone / attribute.duration;

		attribute.value = lib.interpolate(
			attribute.from,
			attribute.to,
			lib.clamp(attribute.progress, 0.0, 1.0),
			attribute.ease
		);

		if (attribute.progress >= 1.0) {
			attribute.value = attribute.to;
			attribute.finishing = true;
		}
	},
};

export default SequencerAnimationEngine;
