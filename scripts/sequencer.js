async function wait(ms) { return new Promise(resolve => { setTimeout(resolve, ms); }); }

import * as lib from './lib.js';

export class Sequence{

    constructor() {
        this.sections = [];
    }

    _proxyWrap(inSection){

        return new Proxy(inSection, {
            get(target, name, receiver) {

                if (typeof target[name] === 'undefined') {
                    if (typeof target.sequence[name] === 'undefined') {
                        throw new Error(`Function ${name} was not found!`);
                    }
                    return target.sequence[name];
                }

                return Reflect.get(target, name, receiver);

            }
        });

    }

    _addSection(inSection){
        let section = this._proxyWrap(inSection);
        this.sections.push(section);
        return section;
    }

    then(inFunc, inAsync = true){
        let func = new Section(inFunc, inAsync);
        this._addSection(func)
        return this;
    }

    effect(inFile=""){
        let effect = new Effect(this, inFile);
        return this._addSection(effect);
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

        let func = new Section(this, async function(){
            await macro.execute();
        }, inAsync);

        this._addSection(func);

        return this;
    }

    sound(inFile=""){
        let sound = new Sound(this, inFile);
        return this._addSection(sound);
    }

    wait(ms = 0){

        let section = new Section(this, async function(){
            return new Promise((resolve, reject) => { setTimeout(resolve, ms) });
        }, true);

        this._addSection(section);

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

    constructor(inSequence, inFunc, inAsync) {
        this.sequence = inSequence;
        if(!lib.is_function(inFunc)) throw new Error("The given function needs to be an actual function.");
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

class Effect{

    constructor(inSequence, inFile="") {
        this.sequence = inSequence;
        this._async = false;
        this._delay = 0;
        this._baseFolder = "";
        this._file = "";
        this._from = undefined;
        this._to = undefined;
        this._moves = false;
        this._stretch = false;
        this._scale = undefined;
        this._anchor = undefined;
        this._rotation = 0;
        this._missed = false;
        this._overrides = [];
    }

    _sanitizeEffect() {

        let effect = {
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
            speed: 0,
            _distance: 0
        };

        if (this._from) {
            if (this._from instanceof Token) {
                effect.position = {
                    x: this._from.center.x,
                    y: this._from.center.y
                }
                if(!this._anchor){
                    effect.anchor = {
                        x: 0.5,
                        y: 0.5
                    }
                }
            } else {
                effect.position = {
                    x: this._from?.x ?? 0,
                    y: this._from?.y ?? 0,
                }
            }
        }

        if (this._to) {

            if (this._to instanceof Token) {

                if(this._missed){
                    this._to = this._calculateMissedPosition(this._to);
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

            let ray = new Ray(effect.position, this._to);

            effect.rotation = ray.angle;

            effect._distance = ray.distance;

            if (this._moves) {
                effect.distance = ray.distance;

                if (!this._anchor) {
                    effect.anchor = {
                        x: 0.8,
                        y: 0.5,
                    };
                }
            }else if (this._stretch){
                effect.width = ray.distance;

                if (!this._anchor) {
                    effect.anchor = {
                        x: 0.0,
                        y: 0.5,
                    };
                }

            }else{

                if (!this._anchor) {
                    effect.anchor = {
                        x: 0.0,
                        y: 0.5,
                    };
                }

            }

        }

        effect.rotation += this._rotation;

        for(let override of this._overrides){
            effect = override(effect);
        }

        effect.file = this._baseFolder + effect.file;

        return effect;

    }

    _calculateMissedPosition(target){

        let oddEvenX = Math.random() < 0.5 ? -1 : 1;
        let oddEvenY = Math.random() < 0.5 ? -1 : 1;
        let missMax;
        let missMin;
        let targetSize = target?.actor?.data?.data?.traits?.size ?? "med";

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

    baseFolder(inBaseFolder){
        if(!inBaseFolder.endsWith("/") || !inBaseFolder.endsWith("\\")){
            inBaseFolder = inBaseFolder.replace("\\", "/");
            inBaseFolder += "/";
        }
        this._baseFolder = inBaseFolder;
        return this;
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

    addOverride(inFunc){
        if(!lib.is_function(inFunc)) throw new Error("The given function needs to be an actual function.");
        this._overrides.push(inFunc);
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
        let effect = this._sanitizeEffect();
        let delay = this._delay;
        let async = this._async;
        let self = this;
        return new Promise((resolve, reject) => {
            setTimeout(async function () {
                game.socket.emit("module.fxmaster", effect);
                if (async) {
                    await canvas.fxmaster.playVideo(effect);
                } else {
                    canvas.fxmaster.playVideo(effect);
                }
                resolve(self);
            }, delay);
        });
    }

}

class Sound{

    constructor(inSequence, inFile="") {
        this.sequence = inSequence;
        this._delay = 0;
        this._file = inFile;
        this._volume = 0.8;
    }

    _sanitizeSound(){

        let sound = {
            src: [this._file],
            volume: this._volume ?? 0.8,
            autoplay: true,
            loop: false
        };

        return sound;

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
        let sound = this._sanitizeSound();
        let delay = this._delay;
        let self = this;
        return new Promise(resolve => {
            setTimeout(async function () {
                AudioHelper.play(sound, true);
                resolve(self);
            }, delay);
        });
    }

}