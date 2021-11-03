import * as lib from './lib/lib.js';

class SequencerEffectPlayer {

    constructor(){
        this.initializeEvents()
    }

    initializeEvents(){

        //canvas.sequencerEffectsAboveTokens.

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
            startX = event.pageX;
            startY = event.pageY;
            _this.hotkeyState.MouseDown = true;
        });

        document.body.addEventListener("mousemove", function(event){
            if(!_this.hotkeyState.MouseDown) return;
            let diffX = Math.abs(event.pageX - startX);
            let diffY = Math.abs(event.pageY - startY);
            _this.hotkeyState.dragging = (diffX > 6 || diffY > 6) || _this.hotkeyState.dragging;
            if(_this.hotkeyState.dragging) _this.dragging({
                start: { x: startX, y: startY },
                end: { x: event.pageX, y: event.pageY }
            });
        });

        document.body.addEventListener("mouseup", function(event) {
            const canvas = document.getElementById("board");
            if(event.target !== canvas) return;
            _this.click(event);
            _this.hotkeyState.dragging = false;
            _this.hotkeyState.MouseDown = false;
        });

        document.body.addEventListener("keydown", function(event){
            if(hotkeys.includes(event.key)){
                _this.hotkeyState[event.key] = true;
            }
        });

        document.body.addEventListener("keyup", function(event){
            if(hotkeys.includes(event.key)){
                _this.hotkeyState[event.key] = false;
            }
        });

        document.body.addEventListener("scroll", function(event){
            _this.scroll(event);
        });
    }

    click(event){

    }

    dragging(positions){
        canvas.sequencerEffectsAboveTokens.drawLine(positions);
    }

    scroll(event){

    }
}

const SequencerPlayer = new SequencerEffectPlayer();

export default SequencerPlayer;