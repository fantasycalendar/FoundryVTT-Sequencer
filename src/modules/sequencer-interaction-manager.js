import * as lib from "../lib/lib.js";
import * as canvaslib from "../lib/canvas-lib.js";
import SequencerEffectManager from "./sequencer-effect-manager.js";
import CONSTANTS from "../constants.js";
import SequencerFileCache from "./sequencer-file-cache.js";
import { EffectsUIApp } from "../formapplications/effects-ui/effects-ui-app.js";
import { get } from "svelte/store";
import { PlayerSettings } from "../formapplications/effects-ui/effect-player-store.js";

/**
 * -------------------------------------------------------------
 * |         THIS IS A MESS, YOU HAVE BEEN WARNED              |
 * -------------------------------------------------------------
 */

export const InteractionManager = {
  startDragPosition: false,

  state: {
    LeftMouseDown: false,
    RightMouseDown: false,
    Dragging: false,
  },

  get isLayerActive() {
    return canvas.sequencerInterfaceLayer.active;
  },

  initialize() {
    window.addEventListener("mousedown", (event) => {
      if (!canvas.ready) return;
      if (!this.isLayerActive) return;
      const hover = document.elementFromPoint(event.clientX, event.clientY);
      if (!hover || hover.id !== "board") return;

      const button = event.button;
      if (!(button === 0 || button === 2)) return;
      if (button === 0) {
        this.state.LeftMouseDown = true;
        this._propagateEvent("mouseLeftDown");
      }
      if (button === 2) {
        this.state.RightMouseDown = true;
        this._propagateEvent("mouseRightDown");
      }
    });

    window.addEventListener("mouseup", (event) => {
      if (!canvas.ready) return;
      if (!this.isLayerActive) return;
      const hover = document.elementFromPoint(event.clientX, event.clientY);
      if (!hover || hover.id !== "board") return;
      if (document.activeElement.tagName !== "BODY") return;

      const button = event.button;
      if (!(button === 0 || button === 2)) return;
      if (button === 0) {
        this.state.LeftMouseDown = false;
        this._propagateEvent("mouseLeftUp");
        this.state.Dragging = false;
        this.startDragPosition = false;
      }
      if (button === 2) {
        this.state.RightMouseDown = false;
        this._propagateEvent("mouseRightUp");
        this.state.Dragging = false;
        this.startDragPosition = false;
      }
    });

    window.addEventListener("mousemove", (event) => {
      if (!canvas.ready) return;
      if (!this.isLayerActive) return;
      const hover = document.elementFromPoint(event.clientX, event.clientY);
      if (!hover || hover.id !== "board") return;
      this._propagateEvent("mouseMove");
      if (this.state.LeftMouseDown && !this.startDragPosition) {
        this.startDragPosition = canvaslib.get_mouse_position();
      }
      if (this.state.LeftMouseDown && !this.state.Dragging) {
        const distance = canvaslib.distance_between(
          this.startDragPosition,
          canvaslib.get_mouse_position()
        );
        this.state.Dragging = distance > 20;
      }
    });

    EffectPlayer.initialize();
    SelectionManager.initialize();
  },

  tearDown() {
    EffectPlayer.tearDown();
    SelectionManager.tearDown();
  },

  _propagateEvent(eventName) {
    if (EffectPlayer.isActive && EffectPlayer[eventName]) {
      EffectPlayer[eventName]();
    }
    if (SelectionManager.isActive && SelectionManager[eventName]) {
      SelectionManager[eventName]();
    }
  },
};

export const EffectPlayer = {
  sequenceBuffer: [],

  playMany: false,
  playManySequenced: false,

  cursorPos: false,
  startPos: false,
  endPos: false,

  get snapLocationToGrid() {
    return get(PlayerSettings.snapToGrid.store);
  },

  get sourceAttach() {
    return get(PlayerSettings.attachTo.store);
  },

  get targetAttach() {
    return get(PlayerSettings.stretchToAttach.store);
  },

  sourceAttachFound: false,
  targetAttachFound: false,

  get isActive() {
    return (
      InteractionManager.isLayerActive && game?.activeTool === CONSTANTS.TOOLS.PLAY
    );
  },

  /**
   * Opens the Sequencer Effects UI with the player tab open
   */
  show() {
    return EffectsUIApp.show({ tab: "player" });
  },

  initialize() {
    this.layer = canvas.sequencerInterfaceLayer;
  },

  tearDown() {
    this._reset();
  },

  /**
   * Mouse events
   */
  mouseLeftDown() {
    this._evaluateStartPosition();
  },

  mouseLeftUp() {
    if (!this.startPos) return;
    this._playEffect();
    this.startPos = false;
    this.endPos = false;
    this.sourceAttachFound = false;
    this.targetAttachFound = false;
  },

  mouseRightUp() {
    this._reset();
  },

  mouseMove() {
    this._evaluateCursorPosition();

    if (InteractionManager.state.Dragging) {
      this._evaluateEndPosition();
    }
  },

  /**
   * Hotkeys
   */
  playManyUp() {
    this._playEffects();
    this._reset();
  },

  /**
   * Private methods
   */
  _evaluatePosition(attach = false) {
    let position = canvaslib.get_mouse_position(this.snapLocationToGrid);

    const attachToObject = attach
      ? canvaslib.get_closest_token(position, {
          minimumDistance: canvas.grid.size,
        })
      : false;

    let attachFound = false;
    if (attachToObject) {
      attachFound = true;
      position = canvaslib.get_object_position(attachToObject);
    }

    return [position, attachFound];
  },

  _evaluateCursorPosition() {
    const attach = InteractionManager.state.Dragging
      ? this.targetAttach
      : this.sourceAttach;

    [this.cursorPos] = this._evaluatePosition(attach);
  },

  _evaluateStartPosition() {
    if (this.startPos) return;

    [this.startPos, this.sourceAttachFound] = this._evaluatePosition(
      this.sourceAttach
    );
  },

  _evaluateEndPosition() {
    [this.endPos, this.targetAttachFound] = this._evaluatePosition(
      this.targetAttach
    );
  },

  _reset() {
    if (!this.layer) return;
    this.startPos = false;
    this.endPos = false;
    this.sourceAttachFound = false;
    this.targetAttachFound = false;
    this.sequenceBuffer = [];
    this._evaluateCursorPosition();
  },

  async _playEffect() {
    const settings = foundry.utils.mergeObject(PlayerSettings.export(), {
      ...InteractionManager.state,
      startPos: this.startPos,
      endPos: this.endPos,
    });

    if (!settings.users.length || settings.users?.[0] === "all")
      settings.users = [];

    if (settings.file === "") return;

    if (
      !(
        Sequencer.Database.entryExists(settings.file) ||
        (await SequencerFileCache.srcExists(settings.file))
      )
    ) {
      throw lib.custom_error(
        "Sequencer",
        `Sequencer Player | Could not find file or database entry: ${settings.file}`
      );
    }

    if (settings.preload) {
      await Sequencer.Preloader.preloadForClients(settings.file);
    }

    const sequence =
      this.sequenceBuffer.length > 0 && this.playManySequenced
        ? this.sequenceBuffer[this.sequenceBuffer.length - 1]
        : new Sequence();

    const effect = sequence
      .effect()
      .file(settings.file)
      .forUsers(settings.users)
      .mirrorX(settings.mirrorX && !settings.randomMirrorX)
      .mirrorY(settings.mirrorY && !settings.randomMirrorY)
      .randomizeMirrorX(settings.randomMirrorX)
      .randomizeMirrorY(settings.randomMirrorY)
      .persist(settings.persist)
      .belowTokens(settings.belowTokens);

    if (settings.repeat) {
      effect.repeats(
        settings.repetitions,
        settings.repeatDelayMin,
        settings.repeatDelayMax
      );
    }

    if (settings.fadeIn > 0) effect.fadeIn(settings.fadeIn);
    if (settings.fadeOut > 0) effect.fadeOut(settings.fadeOut);

    const offsetData = settings.randomOffset
      ? {
          offset: { x: settings.offsetX, y: settings.offsetY },
          gridUnits: settings.offsetGridUnits,
        }
      : {};
    const offsetSource = !settings.Dragging ? offsetData : {};
    const attachToObject = settings.attachTo
      ? canvaslib.get_closest_token(settings.startPos, {
          minimumDistance: canvas.grid.size,
        })
      : false;
    if (attachToObject) {
      effect.attachTo(attachToObject, {
        randomOffset:
          settings.randomOffset && !settings.Dragging
            ? settings.randomOffsetAmount
            : false,
        ...offsetSource,
      });
    } else {
      effect.atLocation(settings.startPos, {
        randomOffset:
          settings.randomOffset && !settings.Dragging
            ? settings.randomOffsetAmount
            : false,
        ...offsetSource,
      });
    }

    if (
      settings.persist &&
      settings.name &&
      settings.name !== "" &&
      settings.name !== "default" &&
      settings.name !== "new"
    ) {
      effect.name("Preset: " + settings.name);
    }

    if (settings.Dragging) {
      if (settings.moveTowards) {
        effect.moveTowards(settings.endPos, {
          randomOffset: settings.randomOffset
            ? settings.randomOffsetAmount
            : false,
          ...offsetData,
        });
        if (settings.moveSpeed) {
          effect.moveSpeed(settings.moveSpeed);
        }
      } else {
        let target = settings.stretchToAttach
          ? canvaslib.get_closest_token(settings.endPos, {
              minimumDistance: canvas.grid.size,
            })
          : settings.endPos;
        effect.stretchTo(target, {
          attachTo: settings.stretchToAttach,
          randomOffset: settings.randomOffset
            ? settings.randomOffsetAmount
            : false,
          ...offsetData,
        });
      }
    }

    if (!settings.Dragging || (settings.Dragging && settings.moveTowards)) {
      effect.scale(settings.scale);
      if (settings.scaleIn > 0)
        effect.scaleIn(0, settings.scaleIn, { ease: "easeInOutSine" });
      if (settings.scaleOut > 0)
        effect.scaleOut(0, settings.scaleOut, { ease: "easeInOutSine" });
      effect.randomRotation(settings.randomRotation);
    }

    if (this.playManySequenced) {
      effect.waitUntilFinished();
    }

    if (!this.playManySequenced || this.sequenceBuffer.length === 0) {
      this.sequenceBuffer.push(sequence);
    }

    if (!this.playMany && !this.playManySequenced) this._playEffects();
  },

  _playEffects() {
    this.sequenceBuffer.forEach((sequence) => sequence.play());
    this.sequenceBuffer = [];
  },
};

export const SelectionManager = {
  selectedEffect: false,
  hoveredEffects: new Set(),
  suggestedProperties: false,
  sourceOrTarget: false,
  dragOffset: false,
  hoveredEffectUI: false,

  get snapToGrid() {
    return get(PlayerSettings.snapToGrid.store);
  },

  set snapToGrid(bool) {
    PlayerSettings.snapToGrid.store.set(bool);
  },

  set attachToTarget(bool) {
    PlayerSettings.stretchToAttach.store.set(bool);
  },

  get attachToTarget() {
    return get(PlayerSettings.stretchToAttach.store);
  },

  get isActive() {
    return (
      InteractionManager.isLayerActive && game?.activeTool === CONSTANTS.TOOLS.SELECT
    );
  },

  get effects() {
    return SequencerEffectManager.effects.filter(
      (effect) => effect.userCanDelete
    );
  },

  initialize() {
    this.layer = canvas.sequencerInterfaceLayer;
  },

  tearDown() {
    this._reset();
    this.hoveredEffects = new Set();
  },

  sourcePointSelected() {
    this.sourceOrTarget = "source";
  },

  targetPointSelected() {
    this.sourceOrTarget = "target";
  },

  /**
   * Mouse Events
   */
  mouseLeftDown() {
    if (!this.selectedEffect) {
      return this._selectEffects();
    }
    if (!this.hoveredEffects.size) {
      this._reset();
    }
  },

  mouseRightDown() {},

  mouseLeftUp() {
    if (!InteractionManager.state.Dragging) {
      return this._selectEffects();
    }
    if (
      !InteractionManager.state.Dragging ||
      !this.selectedEffect ||
      !this.suggestedProperties
    )
      return;
    this._updateEffect();
  },

  mouseRightUp() {
    InteractionManager.state.LeftMouseDown = false;
    this.suggestedProperties = false;
    this.sourceOrTarget = false;
    this.dragOffset = false;
  },

  mouseMove() {
    this._evaluateHoveredEffects();
    if (
      InteractionManager.state.LeftMouseDown &&
      !InteractionManager.state.RightMouseDown
    ) {
      this._evaluateEffectPositionUpdate();
    }
  },

  /**
   * Hotkeys
   */
  async delete() {
    if (!this.selectedEffect) return;
    await SequencerEffectManager.endEffects({ effects: this.selectedEffect });
    this.selectedEffect = false;
  },

  attachToTargetDown() {
    if (
      InteractionManager.state.LeftMouseDown &&
      !InteractionManager.state.RightMouseDown
    ) {
      this._evaluateEffectPositionUpdate();
    }
  },

  /**
   * Private methods
   */
  _selectEffects() {
    this._reset();
    if (!this.hoveredEffects.size) return;
    const firstElement = Array.from(this.hoveredEffects)[0];
    this.selectedEffect = !firstElement.selected ? firstElement : false;
  },

  _evaluateHoveredEffects() {
    const position = canvaslib.get_mouse_position();
    this.hoveredEffects = this.effects.filter((effect) =>
      effect.isPositionWithinBounds(position)
    );
    this.hoveredEffects.sort((a, b) => {
      return a.data.layer !== b.data.zIndex
        ? a.data.zIndex - b.data.zIndex
        : a.data.layer - b.data.zIndex;
    });
    this.hoveredEffects = new Set(this.hoveredEffects);
  },

  _evaluateEffectPositionUpdate() {
    if (!this.selectedEffect) return;

    if (this.selectedEffect.data.stretchTo && !this.sourceOrTarget) {
      return;
    }

    let showCursor = false;
    let showPoint = this.snapToGrid;

    let position = canvaslib.get_mouse_position(this.snapToGrid);

    if (!this.selectedEffect.data.stretchTo && !this.dragOffset) {
      this.dragOffset = {
        x: position.x - this.selectedEffect.position.x,
        y: position.y - this.selectedEffect.position.y,
      };
    }

    if (this.attachToTarget) {
      const obj = canvaslib.get_closest_token(position, {
        minimumDistance: canvas.grid.size,
      });
      if (obj) {
        position = canvaslib.get_object_position(obj);
        showCursor = true;
        showPoint = false;
      }
    }

    if (this.dragOffset && !showCursor && !this.snapToGrid) {
      position.x -= this.dragOffset.x;
      position.y -= this.dragOffset.y;
    }

    const color =
      (this.sourceOrTarget || "source") === "source"
        ? CONSTANTS.COLOR.PRIMARY
        : CONSTANTS.COLOR.SECONDARY;

    this.suggestedProperties = {
      position,
      showCursor,
      showPoint,
      color,
    };
  },

  _updateEffect() {
    if (!this.selectedEffect) return;

    const updates = {
      attachTo: this.selectedEffect.data.attachTo,
      stretchTo: this.selectedEffect.data.stretchTo,
    };

    const obj = this.attachToTarget
      ? canvaslib.get_closest_token(this.suggestedProperties.position, {
          minimumDistance: canvas.grid.size,
          type: TokenDocument,
        })
      : false;
    let objUuid = obj ? lib.get_object_identifier(obj) : false;

    if (this.sourceOrTarget === "source") {
      if (!updates.attachTo) {
        updates.attachTo = {
          active: false,
          align: "center",
          rotation: true,
          bindVisibility: true,
          bindAlpha: true,
        };
      }
      updates.attachTo = foundry.utils.mergeObject(updates.attachTo || {}, {
        active: this.attachToTarget && !!objUuid,
      });
      if (this.attachToTarget && objUuid) {
        updates.source = objUuid;
      } else {
        updates["source"] = this.suggestedProperties.position;
      }
    } else if (this.sourceOrTarget === "target") {
      updates.stretchTo.attachTo = this.attachToTarget && !!objUuid;
      if (this.attachToTarget && objUuid) {
        updates.target = objUuid;
      } else {
        updates["target"] = this.suggestedProperties.position;
      }
    } else {
      updates["source"] = this.suggestedProperties.position;
    }

    this.selectedEffect.update(updates);

    this.suggestedProperties = false;
    this.sourceOrTarget = false;
    this.dragOffset = false;
  },

  _reset() {
    this.selectedEffect = false;
    this.suggestedProperties = false;
    this.sourceOrTarget = false;
    this.dragOffset = false;
  },
};
