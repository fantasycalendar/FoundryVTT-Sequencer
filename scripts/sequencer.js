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
        this.sections.push(this._createWaitSection());
        return section;
    }

    _createWaitSection(ms= 1){
        return new FunctionSection(this, async function(){
            return new Promise((resolve, reject) => { setTimeout(resolve, ms) });
        }, true);
    }

    then(inFunc, inAsync = true){
        let func = new FunctionSection(inFunc, inAsync);
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

        let func = new FunctionSection(this, async function(){
            await macro.execute();
        }, inAsync);

        this._addSection(func);

        return this;
    }

    sound(inFile=""){
        let sound = new Sound(this, inFile);
        return this._addSection(sound);
    }

    wait(ms = 1){
        if(ms < 1) throw new Error('Wait ms cannot be less than 1')
        let section = this._createWaitSection(ms);
        this._addSection(section);
        return this;
    }

    async play(){
        console.log("Sequencer | Starting playback...")
        for(let section of this.sections){
            await section.execute();
        }
        console.log("Sequencer | Playback done!")
    }

}

class Section{

    constructor(){
        this._repetitions = 1;
        this._delayMin = 0;
        this._delayMax = 0;
    }

    repeats(inRepetitions, delayMin = 1, delayMax = 1){
        this._repetitions = inRepetitions;
        this._delayMin = delayMin;
        this._delayMax = Math.max(delayMin, delayMax);
        return this;
    }

    async execute(){
        for(let i = 0; i < this._repetitions; i++){
            await this.run();
            await this.wait();
        }
    }

    async wait(){
        let delay = lib.random_float_between(this._delayMin, this._delayMax);
        return new Promise((resolve) => {
            setTimeout(resolve, delay)
        });
    }

}

class FunctionSection extends Section{

    constructor(inSequence, inFunc, inAsync) {
        super();
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

class Effect extends Section{

    constructor(inSequence, inFile="") {
        super()
        this.sequence = inSequence;
        this._async = false;
        this._delay = 0;
        this._baseFolder = "";
        this._file = "";
        this._from = false;
        this._to = false;
        this._moves = false;
        this._stretch = false;
        this._scale = false;
        this._anchor = false;
        this._rotation = 0;
        this._missed = false;
        this._startPoint = 0;
        this._endPoint = 0;
        this._cachedDimensions = {};
        this._mustache = false;
        this._overrides = [];
    }

    async _sanitizeEffect() {

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
            speed: 0,
            _distance: 0
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

            let target;

            if (this._to instanceof Token) {

                if(this._missed){
                    target = this._calculateMissedPosition(this._to);
                }else{
                    target = {
                        x: this._to.center.x,
                        y: this._to.center.y
                    }
                }

            } else {
                target = {
                    x: this._to?.x ?? 0,
                    y: this._to?.y ?? 0,
                }
            }

            let ray = new Ray(data.position, target);

            data.rotation = ray.angle;

            data._distance = ray.distance;

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

        for(let override of this._overrides){
            data = await override(this, data);
        }

        if(Array.isArray(data.file)){
            data.file = lib.random_array_element(data.file)
        }

        if(this._mustache){
            let template = Handlebars.compile(data.file);
            data.file = template(this._mustache);
        }

        data = await this._calculateHitVector(data);

        data.file = (this._baseFolder + data.file);

        return data;

    }

    async _getFileDimensions(inFile){
        let file = this._baseFolder + inFile;
        if(Object.keys(this._cachedDimensions).indexOf(file) > -1){
            return this._cachedDimensions[file];
        }
        this._cachedDimensions[file] = await lib.getDimensions(file);
        return this._cachedDimensions[file];
    }

    _getTrueLength(inDimensions){
        return inDimensions.x - this._startPoint - this._endPoint;
    }

    async _calculateHitVector(data){
        if(data._distance === 0) return data;

        let dimensions = await this._getFileDimensions(data.file);
        let trueLength = this._getTrueLength(dimensions);

        data.scale.x = data._distance / trueLength;
        data.scale.y = Math.max(0.4, data.scale.x);
        data.anchor.x = this._startPoint / dimensions.x;

        return data;
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
        if(typeof inFile !== "string") throw new Error("ms must be of type string");
        this._file = inFile;
        return this;
    }

    delay(ms) {
        if(typeof ms !== "number") throw new Error("ms must be of type number");
        this._delay = ms;
        return this;
    }

    async(inBool) {
        if(typeof inBool !== "boolean") throw new Error("inBool must be of type number");
        this._async = inBool;
        return this;
    }

    moves(inBool) {
        if(typeof inBool !== "boolean") throw new Error("inBool must be of type number");
        this._moves = inBool;
        return this;
    }

    stretch(inBool) {
        if(typeof inBool !== "boolean") throw new Error("inBool must be of type number");
        this._stretch = inBool;
        return this;
    }

    missed(inBool){
        if(typeof inBool !== "boolean") throw new Error("inBool must be of type number");
        this._missed = inBool;
        return this;
    }

    addOverride(inFunc){
        if(!lib.is_function(inFunc)) throw new Error("The given function needs to be an actual function.");
        this._overrides.push(inFunc);
        return this;
    }

    setMustache(inMustache){
        this._mustache = inMustache;
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

    startPoint(inStartPoint){
        if(typeof inStartPoint !== "number") throw new Error("inStartPoint must be of type number");
        this._startPoint = inStartPoint;
        return this;
    }

    endPoint(inEndPoint){
        if(typeof inEndPoint !== "number") throw new Error("inEndPoint must be of type number");
        this._endPoint = inEndPoint;
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
        let effect = await this._sanitizeEffect();
        let delay = this._delay;
        let async = this._async;
        let self = this;
        return new Promise((resolve) => {
            setTimeout(async function () {
                game.socket.emit("module.fxmaster", effect);
                if (async) {
                    await canvas.fxmaster.playVideo(effect);
                } else {
                    canvas.fxmaster.playVideo(effect);
                }
                resolve();
            }, delay);
        });
    }

}

class Sound extends Section{

    constructor(inSequence, inFile="") {
        super();
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