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
        attributes: attributes.map(attribute => {
          attribute.targetId = lib.get_object_identifier(attribute.target) + "-" + attribute.propertyName;
          attribute.started = false;
          attribute.initialized = false;
          attribute.finishing = false;
          attribute.complete = false;
          attribute.progress = 0;
          attribute.value = 0;

          attribute.duration = attribute.duration ?? 0;
          attribute.durationDone = timeDifference ?? 0;

          if (attribute?.looping) {
            attribute.loopDuration = attribute.loopDuration ?? attribute.duration ?? 0;
            attribute.loopDurationDone = timeDifference % attribute.loopDuration ?? 0;
            attribute.loops = attribute.loops ?? 0;
            attribute.loopsDone = Math.floor(attribute.durationDone / attribute.duration);
            attribute.index = (attribute.loopsDone) % attribute.values.length;
            attribute.nextIndex = (attribute.loopsDone + 1) % attribute.values.length;
            if (!attribute.pingPong && attribute.nextIndex === 0) {
              attribute.index = 0;
              attribute.nextIndex = 1;
            }
          }
          return attribute;
        }),
        complete: false,
        totalDt: timeDifference,
        resolve: resolve
      });
      if (!this.ticker || !this.ticker.started) {
        this.start();
      }
      lib.debug(`Added animations to Animation Engine`);
    });

  },

  endAnimations(target) {
    this._animations = this._animations.filter(animation => animation.origin !== target);
  },

  start() {
    lib.debug(`Animation Engine Started`);
    if (!this.ticker) {
      this.ticker = new PIXI.Ticker;
      this.ticker.add(this.nextFrame.bind(this));
    }
    this.ticker.start();
  },

  nextFrame() {

    if (this._animations.length === 0) {
      lib.debug(`Animation Engine Paused`);
      this.ticker.stop();
      this._startingValues = {};
      return;
    }

    this._animations.forEach(animation => this._animate(animation));
    this._animations = this._animations.filter(animation => !animation.complete);
    this._applyDeltas();
    for (const targetId of Object.keys(this._startingValues)) {
      if (!this._animations.some(_a => _a.attributes.some(_b => _b.targetId === targetId))) {
        delete this._startingValues[targetId];
      }
    }

  },

  _startingValues: {},

  _applyDeltas() {

    const deltas = [];

    for (const animation of this._animations) {

      for (const attribute of animation.attributes) {

        if (!attribute.started || attribute.complete) continue;

        if (attribute.finishing) {
          attribute.complete = true;
        }

        let delta = deltas.find(delta => attribute.target === delta.target && attribute.setPropertyName === delta.setPropertyName);

        if (!delta) {

          delta = {
            targetId: attribute.targetId,
            target: attribute.target,
            getPropertyName: attribute.getPropertyName ?? attribute.propertyName,
            setPropertyName: attribute.propertyName,
            value: 0
          };

          if(attribute.target instanceof PIXI.filters.ColorMatrixFilter){
            delta.value = attribute.previousValue;
          }

          deltas.push(delta)

        }

        delta.value += attribute.delta;

      }

    }

    for (let delta of deltas) {

      const finalValue = lib.deep_get(delta.target, delta.getPropertyName) + delta.value;

      try {
        lib.deep_set(
          delta.target,
          delta.setPropertyName,
          finalValue
        )
      } catch (err) {
        //console.log(err)
      }
    }

  },

  _animate(animation) {

    animation.totalDt += this.ticker.elapsedMS;

    animation.attributes.filter(attribute => !attribute.complete)
      .forEach(attribute => this._animateAttribute(animation.totalDt, attribute));

    animation.complete = animation.attributes.filter(attribute => !attribute.complete).length === 0;

    if (animation.complete) {
      animation.resolve();
    }

  },

  _animateAttribute(totalDt, attribute) {

    if (totalDt < attribute.delay) return;

    if (!attribute.started) {

      const funkyProperty = attribute.propertyName.includes("scale") || attribute.propertyName.includes("alpha");

      if (this._startingValues[attribute.targetId] === undefined) {

        const getProperty = funkyProperty || attribute.from === undefined;

        this._startingValues[attribute.targetId] = getProperty
          ? lib.deep_get(attribute.target, attribute.getPropertyName ?? attribute.propertyName)
          : attribute.from;

        if (!attribute.propertyName.includes("scale")) {
          lib.deep_set(attribute.target, attribute.propertyName, this._startingValues[attribute.targetId]);
        }

      }

      attribute.previousValue = this._startingValues[attribute.targetId];

      if (attribute?.looping) {
        attribute.values = attribute.values.map(value => {
          return value + attribute.previousValue - (funkyProperty ? 1.0 : 0);
        })
      } else if (attribute.from === undefined) {
        attribute.from = attribute.previousValue
      }

    }

    attribute.started = true;

    if (attribute?.looping && attribute?.indefinite) {
      this._handleIndefiniteLoop(attribute);
    } else if (attribute?.looping) {
      this._handleLoops(attribute);
    } else {
      this._handleDefault(attribute);
    }

    attribute.delta = attribute.value - attribute.previousValue;

    attribute.previousValue = attribute.value;

  },

  _handleBaseLoop(attribute) {

    if (!attribute.initialized) {
      if (attribute.values.length === 1) {
        attribute.values.unshift(lib.deep_get(
          attribute.target,
          attribute.propertyName
        ));
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

    if (attribute.progress >= 1.0 && attribute.loopsDone === attribute.loops * 2) {
      attribute.finishing = true;
      attribute.value = attribute.values[attribute.index];
    }

    if (attribute.overallProgress >= 1.0) {
      attribute.finishing = true;
    }

  },

  _handleDefault(attribute) {

    attribute.durationDone += this.ticker.deltaMS;
    attribute.progress = attribute.durationDone / attribute.duration;

    attribute.value = lib.interpolate(
      attribute.from,
      attribute.to,
      attribute.progress,
      attribute.ease
    );

    if (attribute.progress >= 1.0) {
      attribute.value = attribute.to;
      attribute.finishing = true;
    }

  }

}

export default SequencerAnimationEngine;
