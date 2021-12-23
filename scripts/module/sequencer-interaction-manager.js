import SequencerEffectsUI from "./formapplications/sequencer-effects-ui.js";
import * as lib from './lib/lib.js';
import * as canvaslib from "./lib/canvas-lib.js";
import SequencerEffectManager from "./sequencer-effect-manager.js";

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
        Shift: false,
        Alt: false,
        Control: false,
        Delete: false
    },

    get isLayerActive() {
        return canvas.sequencerEffectsAboveTokens.active;
    },

    get playActive() {
        return game.activeTool === "play-effect";
    },

    get selectActive() {
        return game.activeTool === "select-effect";
    },

    initialize() {

        this.interaction = canvas?.app?.renderer?.plugins?.interaction;

        const board = document.getElementById("board");

        document.body.addEventListener('keydown', async (event) => {
            const key = event.key;
            if (!Object.keys(this.state).includes(key)) return;
            this.state[key] = true;
            this._propagateEvent(`${key.toLowerCase()}Down`);
        });

        document.body.addEventListener('keyup', async (event) => {
            const key = event.key;
            if (!Object.keys(this.state).includes(key)) return;
            this.state[key] = false;
            this._propagateEvent(`${key.toLowerCase()}Up`);
        });

        document.body.addEventListener("mousedown", (event) => {
            if(event.target !== board) return;
            if (!this.isLayerActive) return;
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

        document.body.addEventListener("mouseup", (event) => {
            if(event.target !== board) return;
            if (!this.isLayerActive) return;
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

        document.body.addEventListener("mousemove", (event) => {
            if (!this.isLayerActive) return;
            let hoverElements = document.querySelectorAll(':hover');
            let hoverElement = hoverElements[hoverElements.length - 1];
            if(hoverElement !== board) return;
            this._propagateEvent("mouseMove");
            if (this.state.LeftMouseDown && !this.state.Dragging) {
                if (!this.startDragPosition) {
                    this.startDragPosition = canvaslib.get_mouse_position();
                }
                const distance = canvaslib.distance_between(this.startDragPosition, canvaslib.get_mouse_position())
                this.state.Dragging = distance > 30;
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
        if (this.playActive && EffectPlayer[eventName]) {
            EffectPlayer[eventName]();
        }
        if (this.selectActive && SelectionManager[eventName]) {
            SelectionManager[eventName]();
        }
    }

}

export const EffectPlayer = {

    sequenceBuffer: [],

    snapLocationToGrid: false,
    sourceAttach: true,
    targetAttach: true,

    /**
     * Opens the Sequencer Effects UI with the player tab open
     *
     * @returns {SequencerEffectsUI}
     */
    show() {
        return SequencerEffectsUI.show({ tab: "player" });
    },

    initialize() {
        this.layer = canvas.sequencerEffectsAboveTokens;
    },

    tearDown() {
        this._reset();
    },

    /**
     * Mouse events
     */
    mouseLeftDown() {
        this.layer.startPos = canvaslib.get_mouse_position(this.snapLocationToGrid);
    },

    mouseLeftUp() {
        this._playEffect();
        this.layer.startPos = false;
        this.layer.endPos = false;
    },

    mouseRightUp() {
        this._reset();
    },

    mouseMove() {
        if (!InteractionManager.state.Dragging) return;
        this.layer.endPos = canvaslib.get_mouse_position(this.snapLocationToGrid);
    },

    /**
     * Hotkeys
     */
    shiftUp() {
        this._playEffects();
        this._reset();
    },

    /**
     * Private methods
     */
    _reset() {
        if (!this.layer) return;
        this.layer.startPos = false;
        this.layer.endPos = false;
        this.sequenceBuffer = [];
    },

    async _playEffect() {

        const settings = foundry.utils.mergeObject(SequencerEffectsUI.activeSettings, {
            ...InteractionManager.state, startPos: {
                x: this.layer.startPos.x, y: this.layer.startPos.y
            }, endPos: {
                x: this.layer.endPos?.x, y: this.layer.endPos?.y
            }
        });

        if (settings.users[0] === "all") settings.users = [];

        if (settings.file === "") return;

        if (!(Sequencer.Database.entryExists(settings.file) || (await srcExists(settings.file)))) {
            throw lib.custom_error("Sequencer", `Sequencer Player | Could not find file or database entry: ${settings.file}`);
        }

        if (settings.preload) {
            await Sequencer.Preloader.preloadForClients(settings.file)
        }

        const sequence = this.sequenceBuffer.length > 0 && settings.Control ? this.sequenceBuffer[this.sequenceBuffer.length - 1] : new Sequence();

        const effect = sequence.effect()
            .file(settings.file)
            .forUsers(settings.users)
            .belowTokens(settings.belowTokens)
            .repeats(settings.repetitions, settings.repeatDelayMin, settings.repeatDelayMax)
            .randomizeMirrorY(settings.randomMirrorY)
            .persist(settings.persist)

        const attachToObject = settings.attachTo ? canvaslib.get_closest_object(settings.startPos, { minimumDistance: canvas.grid.size }) : false;
        if(attachToObject){
            effect.attachTo(attachToObject);
        }else{
            effect.atLocation(settings.startPos);
        }

        if (settings.persist && settings.name && settings.name !== "" && settings.name !== "default" && settings.name !== "new") {
            effect.name("Preset: " + settings.name)
        }

        if (settings.randomOffset) {
            effect.randomOffset(0.75);
        }

        if (settings.Dragging) {
            if (settings.moveTowards) {
                effect.moveTowards(settings.endPos)
                if (settings.moveSpeed) {
                    effect.moveSpeed(settings.moveSpeed)
                }
            } else {
                let target = settings.stretchToAttach ? canvaslib.get_closest_object(settings.endPos, { minimumDistance: canvas.grid.size }) : settings.endPos;
                effect.stretchTo(target, { attachTo: settings.stretchToAttach })
            }
        } else {
            effect.scale(settings.scale)
            effect.randomRotation(settings.randomRotation)
        }

        if (settings.Control) {
            effect.waitUntilFinished();
        }

        if (!settings.Control || this.sequenceBuffer.length === 0) {
            this.sequenceBuffer.push(sequence);
        }

        if (!settings.Shift) this._playEffects();

    },

    _playEffects() {
        this.sequenceBuffer.forEach(sequence => sequence.play());
        this.sequenceBuffer = [];
    }
}

export const SelectionManager = {

    selectedEffect: false,
    hoveredEffects: new Set(),
    suggestedPosition: false,
    sourceOrTarget: false,
    dragOffset: false,
    hoveredEffectUI: false,

    get effects() {
        return SequencerEffectManager.effects.filter(effect => effect.userCanDelete);
    },

    initialize() {
        this.layer = canvas.sequencerEffectsAboveTokens;
    },

    tearDown() {
        this._deselectEffect();
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
            this._deselectEffect();
        }
    },

    mouseRightDown() {

    },

    mouseLeftUp() {
        if (!InteractionManager.state.Dragging) {
            return this._selectEffects();
        }
        this.layer.selectionBoxDimensions = false;
        if (!InteractionManager.state.Dragging || !this.selectedEffect || !this.suggestedPosition) return;

        const updates = {
            attachTo: this.selectedEffect.data.attachTo, stretchTo: this.selectedEffect.data.stretchTo
        }

        if (InteractionManager.state.Alt) {
            const obj = canvaslib.get_closest_object(this.suggestedPosition, { minimumDistance: canvas.grid.size });
            if (obj) {
                let objUuid = lib.get_object_identifier(obj);
                if (this.sourceOrTarget === "target") {
                    updates.target = objUuid;
                    updates.stretchTo.attachTo = true;
                } else {
                    updates.source = objUuid;
                    updates.attachTo = true;
                }
            }
        } else {
            updates[this.sourceOrTarget ? this.sourceOrTarget : "source"] = this.suggestedPosition;
        }

        this.selectedEffect.update(updates);

        this.suggestedPosition = false;
        this.sourceOrTarget = false;
        this.dragOffset = false;
    },

    mouseRightUp() {
        InteractionManager.state.LeftMouseDown = false;
        this.suggestedPosition = false;
        this.sourceOrTarget = false;
        this.dragOffset = false;
    },

    mouseMove() {
        this._evaluateHoveredEffects();
        if (InteractionManager.state.LeftMouseDown && !InteractionManager.state.RightMouseDown) {
            this._evaluateEffectPositionUpdate()
        }
    },

    /**
     * Hotkeys
     */
    deleteDown() {
        SequencerEffectManager.endEffects({ effects: this.selectedEffect });
        this.selectedEffect = false;
    },

    altDown() {
        if (InteractionManager.state.LeftMouseDown && !InteractionManager.state.RightMouseDown) {
            this._evaluateEffectPositionUpdate();
        }
    },

    /**
     * Private methods
     */
    _deselectEffect() {
        this._reset();
    },

    _selectEffects() {
        this._deselectEffect();
        if (!this.hoveredEffects.size) return;
        const firstElement = Array.from(this.hoveredEffects)[0];
        this.selectedEffect = !firstElement.selected ? firstElement : false;
    },

    _evaluateHoveredEffects() {
        const position = canvaslib.get_mouse_position();
        this.hoveredEffects = this.effects.filter(effect => effect.isPositionWithinBounds(position));
        this.hoveredEffects.sort((a, b) => {
            return a.data.layer !== b.data.zIndex ? a.data.zIndex - b.data.zIndex : a.data.layer - b.data.zIndex;
        });
        this.hoveredEffects = new Set(this.hoveredEffects);
    },

    _evaluateEffectPositionUpdate() {

        if (!this.selectedEffect) return;

        let showCursor = false;
        let showPoint = InteractionManager.state.Control;

        let position = canvaslib.get_mouse_position(InteractionManager.state.Control);

        if (!this.selectedEffect.data.stretchTo && !this.dragOffset) {
            this.dragOffset = {
                x: position.x - this.selectedEffect.position.x, y: position.y - this.selectedEffect.position.y
            }
        }

        if (InteractionManager.state.Alt) {
            const obj = canvaslib.get_closest_object(position, { minimumDistance: canvas.grid.size })
            if (obj) {
                position = canvaslib.get_object_position(obj);
                showCursor = true;
                showPoint = false;
            }
        }

        if (this.dragOffset && !showCursor && !InteractionManager.state.Control) {
            position.x -= this.dragOffset.x;
            position.y -= this.dragOffset.y;
        }

        const color = (this.sourceOrTarget || "source") === "source" ? 0xFFFF00 : 0xFF00FF;

        this.suggestedPosition = {
            x: position.x, y: position.y, showCursor, showPoint, color
        };
    },

    _reset() {
        this.selectedEffect = false;
        this.suggestedPosition = false;
        this.sourceOrTarget = false;
        this.dragOffset = false;
    }

}