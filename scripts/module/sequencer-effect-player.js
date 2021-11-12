import SequencerEffectsUI from "./formapplications/sequencer-effects-ui.js";
import * as lib from './lib/lib.js';

class SequencerEffectPlayer {

    constructor(){
        this.sequenceBuffer = [];
        this.initializeEvents()
        this.snapLocationToGrid = false;
    }

    /**
     * Opens the Sequencer Effects UI with the player tab open
     *
     * @returns {SequencerEffectsUI}
     */
    show(){
        return SequencerEffectsUI.show({ tab: "player" });
    }

    get effectSettings(){
        return SequencerEffectsUI.activeSettings;
    }

    get playActive(){
        return game.activeTool === "play-effect";
    }

    initializeEvents(){

        this.hotkeyState = {
            MouseDown: false,
            Dragging: false,
            Shift: false,
            Alt: false,
            Control: false,
            Delete: false
        }

        const hotkeys = Object.keys(this.hotkeyState);

        const _this = this;

        let startX;
        let startY;
        document.body.addEventListener("mousedown", function(event){
            const canvas = document.getElementById("board");
            if(event.target !== canvas || event.button !== 0) return;
            startX = event.pageX;
            startY = event.pageY;
            _this.hotkeyState.MouseDown = true;
            _this.mouseDown();
        });

        document.body.addEventListener("mousemove", function(event){
            if(!_this.hotkeyState.MouseDown) return;
            let diffX = Math.abs(event.pageX - startX);
            let diffY = Math.abs(event.pageY - startY);
            _this.dragging((diffX > 10 || diffY > 10) || _this.hotkeyState.Dragging);
        });

        document.body.addEventListener("mouseup", function(event) {
            const canvas = document.getElementById("board");
            if(event.target !== canvas) return;
            if(event.button === 2){
                _this.cancel(event);
            }
            if(event.button !== 0 || !_this.hotkeyState.MouseDown) return;
            _this.click(event);
        });

        document.body.addEventListener("keydown", function(event){
            if(hotkeys.includes(event.key)){
                _this.hotkeyState[event.key] = true;
                const func = _this[`${event.key}Down`];
                if(func) func.bind(_this)(event);
            }
        });

        document.body.addEventListener("keyup", function(event){
            if(hotkeys.includes(event.key)){
                _this.hotkeyState[event.key] = false;
                const func = _this[`${event.key}Up`];
                if(func) func.bind(_this)(event);
            }
        });
    }

    get aboveLayer(){
        if(!this._aboveLayer){
            this._aboveLayer = canvas.sequencerEffectsAboveTokens;
        }
        return this._aboveLayer;
    }

    mouseDown(event){
        this.hotkeyState.MouseDown = true;
        if(this.playActive){
            this.aboveLayer.updateStartPoint();
        }
    }

    click(event){
        if(this.playActive) {
            this.playEffect();
            this.aboveLayer.clearLine();
        }
        this.hotkeyState.Dragging = false;
        this.hotkeyState.MouseDown = false;
    }

    cancel(event){
        if(this.hotkeyState.MouseDown) {
            this.aboveLayer.clearLine();
            this.hotkeyState.Dragging = false;
            this.hotkeyState.MouseDown = false;
        }
        if(this.hotkeyState.Shift){
            this.sequenceBuffer = [];
        }
    }

    dragging(isDragging){
        if(!isDragging) return;
        this.hotkeyState.Dragging = isDragging;
        if(this.playActive){
            this.aboveLayer.updateEndPoint();
        }
    }

    ShiftUp(event){
        if(!this.playActive) return;
        this.playEffects();
    }

    async playEffect(){

        const settings = foundry.utils.mergeObject(this.effectSettings,{
            ...this.hotkeyState,
            startPos: {
                x: this.aboveLayer.startPos.x,
                y: this.aboveLayer.startPos.y
            },
            endPos: {
                x: this.aboveLayer.endPos?.x,
                y: this.aboveLayer.endPos?.y
            }
        });

        if(settings.users[0] === "all") settings.users = [];

        if(settings.file === "") return;

        if(!(Sequencer.Database.entryExists(settings.file) || (await srcExists(settings.file)))){
            throw lib.throwError("Sequencer", `Sequencer Player | Could not find file or database entry: ${settings.file}`);
        }

        if(settings.preload){
            await SequencerPreloader.preloadForClients(settings.file)
        }

        const sequence = this.sequenceBuffer.length > 0 && settings.Control
            ? this.sequenceBuffer[this.sequenceBuffer.length-1]
            : new Sequence();

        const effect = sequence.effect()
            .file(settings.file)
            .forUsers(settings.users)
            .atLocation(settings.startPos)
            .belowTokens(settings.belowTokens)
            .repeats(
                settings.repetitions,
                settings.repeatDelayMin,
                settings.repeatDelayMax
            )
            .randomizeMirrorY(settings.randomMirrorY)

        if(settings.name && settings.name !== "" && settings.name !== "default" && settings.name !== "new"){
            effect.name("Preset: " + settings.name)
        }

        if(settings.randomOffset){
            effect.randomOffset(0.75);
        }

        if(settings.Dragging){
            effect.reachTowards(settings.endPos)
        }else{
            effect.scale(settings.scale)
            effect.randomRotation(settings.randomRotation)
        }

        if(settings.Control){
            effect.waitUntilFinished();
        }

        if(!settings.Control || this.sequenceBuffer.length === 0){
            this.sequenceBuffer.push(sequence);
        }

        if(!settings.Shift) this.playEffects();

    }

    playEffects(){
        this.sequenceBuffer.forEach(sequence => sequence.play());
        this.sequenceBuffer = [];
    }
}

const SequencerPlayer = new SequencerEffectPlayer();

export default SequencerPlayer;