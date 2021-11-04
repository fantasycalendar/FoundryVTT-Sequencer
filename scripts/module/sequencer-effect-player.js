import SequencerEffectPlayerUI from "./formapplications/sequencer-effect-player-ui.js";

class SequencerEffectPlayer {

    constructor(){
        this.sequenceBuffer = [];
        this.initializeEvents()
    }

    get effectSettings(){
        return SequencerEffectPlayerUI.activeSettings;
    }

    get active(){
        return SequencerEffectPlayerUI.isVisible;
    }

    initializeEvents(){

        this.hotkeyState = {
            MouseDown: false,
            Dragging: false,
            Shift: false,
            Alt: false,
            Control: false,
        }

        const hotkeys = Object.keys(this.hotkeyState);

        const _this = this;

        let startX;
        let startY;
        document.body.addEventListener("mousedown", function(event){
            const canvas = document.getElementById("board");
            if(event.target !== canvas || event.button !== 0 || !_this.active) return;
            startX = event.pageX;
            startY = event.pageY;
            _this.hotkeyState.MouseDown = true;
            _this.mouseDown();
        });

        document.body.addEventListener("mousemove", function(event){
            if(!_this.hotkeyState.MouseDown || !_this.active) return;
            let diffX = Math.abs(event.pageX - startX);
            let diffY = Math.abs(event.pageY - startY);
            _this.dragging((diffX > 10 || diffY > 10) || _this.hotkeyState.Dragging);
        });

        document.body.addEventListener("mouseup", function(event) {
            const canvas = document.getElementById("board");
            if(event.target !== canvas) return;
            if(!_this.active) return;
            if(event.button === 2){
                _this.cancel(event);
            }
            if(event.button !== 0 || !_this.hotkeyState.MouseDown) return;
            _this.click(event);
        });

        document.body.addEventListener("keydown", function(event){
            if(hotkeys.includes(event.key) && _this.active){
                _this.hotkeyState[event.key] = true;
                const func = _this[`${event.key}Down`];
                if(func) func.bind(_this)(event);
            }
        });

        document.body.addEventListener("keyup", function(event){
            if(hotkeys.includes(event.key) && _this.active){
                _this.hotkeyState[event.key] = false;
                const func = _this[`${event.key}Up`];
                if(func) func.bind(_this)(event);
            }
        });

        document.body.addEventListener("scroll", function(event){
            const canvas = document.getElementById("board");
            if(event.target !== canvas) return;
            if(!_this.active) return;
            _this.scroll(event);
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
        this.aboveLayer.updateStartPoint();
    }

    click(event){
        this.playEffect();
        this.hotkeyState.Dragging = false;
        this.hotkeyState.MouseDown = false;
        this.aboveLayer.clearLine();
    }

    cancel(event){
        if(this.hotkeyState.MouseDown) {
            this.hotkeyState.Dragging = false;
            this.hotkeyState.MouseDown = false;
            this.aboveLayer.clearLine();
        }
        if(this.hotkeyState.Shift){
            this.sequenceBuffer = [];
        }
    }

    dragging(isDragging){
        if(!isDragging) return;
        this.hotkeyState.Dragging = isDragging;
        this.aboveLayer.updateEndPoint();
    }

    scroll(event){

    }

    ShiftUp(event){
        this.playEffects()
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

        if(settings.preload){
            await SequencerPreloader.preloadForClients(settings.file)
        }

        const sequence = new Sequence()
            .effect()
                .file(settings.file)
                .forUsers(settings.users)
                .atLocation(settings.startPos)
                .persist(settings.persist)
                .belowTokens(settings.belowTokens)
                .repeats(
                    settings.repetitions,
                    settings.repeatDelayMin,
                    settings.repeatDelayMax
                )
                .randomizeMirrorY(settings.randomMirrorY)

        if(settings.name && settings.name !== "" && settings.name !== "default" && settings.name !== "new"){
            sequence.name("Preset: " + settings.name)
        }

        if(settings.attachTo){
            const hitToken = canvas.tokens.placeables.find(token => {
                const hitArea = token.hitArea;
                return settings.startPos.x >= token.position.x && settings.startPos.x <= (token.position.x + hitArea.width)
                    && settings.startPos.y >= token.position.y && settings.startPos.y <= (token.position.y + hitArea.height);
            })
            if(hitToken) sequence.attachTo(hitToken)
        }

        if(settings.randomOffset){
            sequence.randomOffset(0.75);
        }

        if(settings.Dragging){
            sequence.reachTowards(settings.endPos)
        }else{
            sequence.scale(settings.scale)
            sequence.randomRotation(settings.randomRotation)
        }

        this.sequenceBuffer.push(sequence);

        if(!settings.Shift) this.playEffects();

    }

    playEffects(){
        this.sequenceBuffer.forEach(sequence => sequence.play());
        this.sequenceBuffer = [];
    }
}

const SequencerPlayer = new SequencerEffectPlayer();

export default SequencerPlayer;