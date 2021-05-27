async function wait(ms) { return new Promise(resolve => { setTimeout(resolve, ms); }); }

import * as lib from './lib.js';

export class Sequence{

    constructor() {
        this.sections = [];
    }

    then(inFunc, inAsync = true){
        let func = new Function(inFunc, inAsync);
        this.sections.push(func);
        return this;
    }

    effect(inFile=""){
        let effect = new Effect(this, inFile);
        this.sections.push(effect);
        return effect;
    }

    macro(inMacro, inAsync = true){

        let macro;
        if(typeof inMacro === "string") {
            macro = game.macros.getName(inMacro);
            if (!macro) {
                throw new Error(`Macro '${inMacro}' was not found`);
            }
        } else if(inMacro instanceof Macro) {
            macro = inMacro;
        } else {
            throw new Error(`inMacro must be of instance string or Macro`);
        }

        let section = new Section(async function(){
            await macro.execute();
        }, inAsync);
        this.sections.push(section);
        return this;
    }

    sound(inFile=""){
        let sound = new Sound(this, inFile);
        this.sections.push(sound);
        return sound;
    }

    wait(ms = 0){

        this.sections.push(new Section(async function(){
            return new Promise((resolve, reject) => { setTimeout(resolve, ms) });
        }, true));

        return this;

    }

    async play(){

        for(let section of this.sections){
            await wait(1);
            await section.run();
        }

    }

}

class Section{

    constructor(inSequence){
        this.sequence = inSequence;
    }

    then(inFunc, inAsync = true){
        return this.sequence.then(inFunc, inAsync);
    }

    effect(inFile=""){
        return this.sequence.effect(inFile);
    }

    macro(inMacro, inAsync = true){
        return this.sequence.macro(inMacro, inAsync)
    }

    sound(inFile=""){
        return this.sequence.sound(inFile);
    }

    wait(ms = 0){
        return this.sequence.wait(ms);
    }

    async play(){
        return this.sequence.play();
    }

}

class Function extends Section{

    constructor(inSequence, inFunc, inAsync) {
        super(inSequence);
        this.func = inFunc;
        this.async = inAsync;
    }

    async run(){
        if(this.async) {
            await this.func();
        }else{
            this.func();
        }
        return this;
    }

}

class Effect extends Section{

    constructor(inSequence, inFile="") {
        super(inSequence)
        this._async = false;
        this._delay = 0;
        this._file = inFile;
        this._from = undefined;
        this._to = undefined;
        this._moves = false;
        this._stretch = false;
        this._scale = undefined;
        this._anchor = undefined;
        this._rotation = 0;
        this._missed = false;
        this._overrideData = function(data){
            return data;
        };
    }

    _sanitizeData() {

        let data = {
            file: this._file,
            position: {
                x: 0,
                y: 0,
            },
            anchor: {
                x: this._anchor?.x ?? 0.0,
                y: this._anchor?.y ?? 0.0
            },
            scale: {
                x: this._scale?.x ?? 1.0,
                y: this._scale?.y ?? 1.0
            },
            angle: 0,
            rotation: 0,
            speed: 0
        };

        if (this._from) {
            if (this._from instanceof Token) {
                data.position = {
                    x: this._from.center.x,
                    y: this._from.center.y
                }
                if(!this._anchor){
                    data.anchor = {
                        x: 0.5,
                        y: 0.5
                    }
                }
            } else {
                data.position = {
                    x: this._from?.x ?? 0,
                    y: this._from?.y ?? 0,
                }
            }
        }

        if (this._to) {

            if (this._to instanceof Token) {

                if(this._missed){
                    this._to = this._calcMissed(this._to);
                }else{
                    this._to = {
                        x: this._to.center.x,
                        y: this._to.center.y
                    }
                }

            } else {
                this._to = {
                    x: this._to?.x ?? 0,
                    y: this._to?.y ?? 0,
                }
            }

            let ray = new Ray(data.position, this._to);

            data.rotation = ray.angle;

            data._distance = ray.distance;
            data._width = ray.distance;

            if (this._moves) {
                data.distance = ray.distance;

                if (!this._anchor) {
                    data.anchor = {
                        x: 0.8,
                        y: 0.5,
                    };
                }
            }else if (this._stretch){
                data.width = ray.distance;

                if (!this._anchor) {
                    data.anchor = {
                        x: 0.0,
                        y: 0.5,
                    };
                }

            }else{

                if (!this._anchor) {
                    data.anchor = {
                        x: 0.0,
                        y: 0.5,
                    };
                }

            }

        }

        data.rotation += this._rotation;

        data = this._overrideData(data);

        return data;

    }

    _calcMissed(target){

        let oddEvenX = Math.random() < 0.5 ? -1 : 1;
        let oddEvenY = Math.random() < 0.5 ? -1 : 1;
        let missMax;
        let missMin;
        let targetSize = target.actor.data.data.traits.size;

        if(targetSize === "grg"){
            missMax = (canvas.grid.size * 3);
            missMin = (canvas.grid.size * 2);
        }else if(targetSize === "huge"){
            missMax = (canvas.grid.size * 2.5);
            missMin = (canvas.grid.size * 1.5);
        }else if(targetSize === "lg"){
            missMax = canvas.grid.size * 2;
            missMin = canvas.grid.size;
        }else{
            missMax = canvas.grid.size * 1.5;
            missMin = canvas.grid.size * 0.5;
        }

        return {
            x: target.center.x + (lib.random_int_between(missMin, missMax) * oddEvenX),
            y: target.center.y + (lib.random_int_between(missMin, missMax) * oddEvenY)
        }

    }

    _validateLocation(inLocation){

        if(inLocation?._id) {
            inLocation = canvas.tokens.get(inLocation._id) ?? inLocation;
        }

        if (inLocation instanceof Token) {
            return inLocation;
        }

        return {
            x: inLocation?.x ?? 0,
            y: inLocation?.y ?? 0
        }

    }

    file(inFile) {
        this._file = inFile;
        return this;
    }

    delay(ms) {
        this._delay = ms;
        return this;
    }

    async(inBool) {
        this._async = inBool;
        return this;
    }

    moves(inBool) {
        this._moves = inBool;
        return this;
    }

    stretch(inBool) {
        this._stretch = inBool;
        return this;
    }

    missed(inBool){
        this._missed = inBool;
        return this;
    }

    overrideData(inFunc){
        if(!(inFunc && {}.toString.call(inFunc) === '[object Function]')){
            throw new Error("inFunc must be a function!")
        }
        this._overrideData = inFunc;
        return this;
    }

    atLocation(inLocation) {
        this._from = this._validateLocation(inLocation);
        return this;
    }

    aimTowards(inLocation) {
        this._to = this._validateLocation(inLocation);
        return this;
    }

    scale(inScale, inScaleMax) {

        if (typeof inScale === "number") {
            if(inScaleMax && typeof inScaleMax === "number"){
                inScale = ((inScaleMax - inScale) * Math.random()) + inScale;
            }
            inScale = {
                x: inScale,
                y: inScale
            }
        }

        this._scale = inScale;
        return this;

    }

    anchor(inAnchor){
        if (typeof inAnchor === "number") {
            inAnchor = {
                x: inAnchor,
                y: inAnchor
            }
        }

        inAnchor = {
            x: inAnchor?.x ?? 0.5,
            y: inAnchor?.y ?? 0.5
        }

        this._anchor = inAnchor;
        return this;
    }

    center() {
        this.anchor();
        return this;
    }

    randomRotation() {
        this._rotation = Math.random() * Math.PI;
        return this;
    }

    async run() {
        let data = this._sanitizeData();
        let delay = this._delay;
        let async = this._async;
        let self = this;
        return new Promise((resolve, reject) => {
            setTimeout(async function () {
                game.socket.emit("module.fxmaster", data);
                if (async) {
                    await canvas.fxmaster.playVideo(data);
                } else {
                    canvas.fxmaster.playVideo(data);
                }
                resolve(self);
            }, delay);
        });
    }

}

class Sound extends Section{

    constructor(inSequence, inFile="") {
        super(inSequence)
        this._delay = 0;
        this._file = inFile;
        this._volume = 0.8;
    }

    _sanitizeData(){

        let data = {
            src: [this._file],
            volume: this._volume ?? 0.8,
            autoplay: true,
            loop: false
        };

        return data;

    }

    file(inFile){
        this._file = inFile;
        return this;
    }

    volume(inVolume){
        this._volume = Math.max(0, Math.min(1.0, inVolume));
        return this;
    }

    delay(ms){
        this._delay = ms;
        return this;
    }

    async run() {
        let data = this._sanitizeData();
        let delay = this._delay;
        let self = this;
        return new Promise(resolve => {
            setTimeout(async function () {
                AudioHelper.play(data, true);
                resolve(self);
            }, delay);
        });
    }

}