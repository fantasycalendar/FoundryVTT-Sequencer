import * as lib from './lib.js';

export class Sequence{

    constructor() {
        this.sections = [];
        this._fileCache = game.settings.get("sequencer", "fileCache");
    }

    _proxyWrap(inSection){
        return new Proxy(inSection, {
            get(target, name, receiver) {
                if (typeof target[name] === 'undefined') {
                    if (typeof target.sequence[name] === 'undefined') {
                        throw new Error(`Function ${name} was not found!`);
                    }
                    return Reflect.get(target.sequence, name, receiver);
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

    _createWaitSection(ms = 1){
        return new FunctionSection(this, async function(){
            return new Promise(async (resolve) => {
                setTimeout(resolve, ms)
            });
        }, true);
    }

    _getFileFromCache(inFile){
        if(inFile in this._fileCache){
            return this._fileCache[inFile];
        }
        return false;
    }

    _addFileToCache(inFile, data){
        this._fileCache[inFile] = data;
        game.settings.set("sequencer", "fileCache", this._fileCache);
    }

    then(inFunc, inAsync = true){
        let func = new FunctionSection(this, inFunc, inAsync);
        this._addSection(func)
        return this;
    }

    effect(inFile=""){
        let effect = new EffectSection(this, inFile);
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

        this._addSection(func)
        return this;
    }

    sound(inFile=""){
        let sound = new SoundSection(this, inFile);
        return this._addSection(sound);
    }

    wait(minMs = 1, maxMs = 1){
        if(minMs < 1) throw new Error('Wait ms cannot be less than 1')
        if(maxMs < 1) throw new Error('Max wait ms cannot be less than 1')
        let wait = lib.random_int_between(minMs, Math.max(minMs, maxMs))
        let section = this._createWaitSection(wait);
        this.sections.push(section);
        return this;
    }

    async play(){
        for(let section of this.sections){
            if(section._async) {
                await section.execute();
            }else{
                section.execute();
            }
        }
    }

}

class Section{

    constructor(inSequence, inAsync = false){
        this.sequence = inSequence;
        this._async = inAsync;
        this._waitUntilFinished = false;
        this._repetitions = 1;
        this._delayMin = 0;
        this._delayMax = 0;
    }

    async(inBool = true){
        if(typeof inBool !== "boolean") throw new Error("inBool must be of type boolean");
        this._async = inBool;
        return this;
    }

    waitUntilFinished(inBool = true){
        if(typeof inBool !== "boolean") throw new Error("inBool must be of type boolean");
        this._waitUntilFinished = inBool;
        return this;
    }

    repeats(inRepetitions, delayMin = 0, delayMax = 0){
        if(typeof inRepetitions !== "number") throw new Error("inRepetitions must be of type number");
        if(typeof delayMin !== "number") throw new Error("delayMin must be of type number");
        if(typeof delayMax !== "number") throw new Error("delayMax must be of type number");
        this._repetitions = inRepetitions;
        this._delayMin = delayMin;
        this._delayMax = Math.max(delayMin, delayMax);
        return this;
    }

    async execute(){
        for(let i = 0; i < this._repetitions; i++){
            if(this._waitUntilFinished){
                await this.run();
            }else{
                this.run();
            }
            if(this._repetitions > 1){
                await this._wait();
            }
        }
    }

    async _wait(){
        let delay = lib.random_float_between(this._delayMin, this._delayMax);
        return new Promise((resolve) => {
            setTimeout(resolve, delay)
        });
    }

}

class FunctionSection extends Section{

    constructor(inSequence, inFunc, inAsync) {
        super(inSequence, inAsync)
        if(!lib.is_function(inFunc)) throw new Error("The given function needs to be an actual function.");
        this._func = inFunc;
    }

    async run(){
        await this._func();
    }

    async execute(){
        await this.run();
    }

}

class EffectSection extends Section{

    constructor(inSequence, inFile="") {
        super(inSequence)
        this.file(inFile);
        this._delay = 0;
        this._baseFolder = "";
        this._from = false;
        this._to = false;
        this._moves = false;
        this._stretch = false;
        this._scale = false;
        this._anchor = false;
        this._randomRotation = false;
        this._rotationOnly = true;
        this._missed = false;
        this._startPoint = 0;
        this._endPoint = 0;
        this._mustache = false;
        this._JB2A = false;
        this._randomX = false;
        this._randomY = false;
        this._gridSize = canvas.grid.size;
        this._overrides = [];
        this._postOverrides = [];
    }

    async _sanitizeEffect() {

        let data = {
            file: this._file,
            position: {
                x: 0,
                y: 0,
            },
            anchor: {
                x: 0.0,
                y: 0.0
            },
            scale: {
                x: 1.0,
                y: 1.0
            },
            angle: 0,
            rotation: 0,
            speed: 0,
            _distance: 0
        };

        if(this._anchor){
            data.anchor = this._anchor;
        }

        if (this._from) {

            let origin = this._calculateMissedPosition(this._from, !this._to && this._missed);

            if(!this._anchor){
                data.anchor = {
                    x: 0.5,
                    y: 0.5
                }
            }

            if(this._to){

                let target = this._calculateMissedPosition(this._to, this._missed);

                if(!this._anchor){
                    data.anchor = {
                        x: 0.0,
                        y: 0.5
                    }
                }

                let ray = new Ray(origin, target);

                data._distance = ray.distance;

                data.rotation = ray.angle;

                if (this._moves) {
                    data.distance = ray.distance;
                }

            }

            data.position = origin;

        }

        data.rotation += this._randomRotation ? Math.random() * Math.PI : 0;

        for(let override of this._overrides){
            data = await override(this, data);
        }

        if(Array.isArray(data.file)){
            data.file = lib.random_array_element(data.file)
        }

        data.scale = {
            x: data.scale.x * (canvas.grid.size / this._gridSize),
            y: data.scale.y * (canvas.grid.size / this._gridSize)
        }

        if(this._mustache){
            let template = Handlebars.compile(data.file);
            data.file = template(this._mustache);
        }

        if(!this._rotationOnly) {
            data = await this._calculateHitVector(data);
        }

        data.scale = {
            x: data.scale.x * (this._scale?.x ?? 1.0),
            y: data.scale.y * (this._scale?.y ?? 1.0)
        }

        let flipX = this._randomX && Math.random() < 0.5 ? -1 : 1;
        data.scale.x = data.scale.x * flipX;

        let flipY = this._randomY && Math.random() < 0.5 ? -1 : 1;
        data.scale.y = data.scale.y * flipY;

        data.file = (this._baseFolder + data.file);

        for(let override of this._postOverrides){
            data = await override(this, data);
        }

        return data;

    }

    async _getFileDimensions(inFile){
        let filePath = this._baseFolder + inFile;
        if(this._JB2A){
            let parts = filePath.replace(".webm", "").split("_");
            let dimensionString = parts[parts.length-1].toLowerCase().split('x');
            if(!isNaN(dimensionString[0]) && !isNaN(dimensionString[1])){
                return {
                    x: Number(dimensionString[0]),
                    y: Number(dimensionString[1])
                }
            }
        }
        let cachedFile = this.sequence._getFileFromCache(filePath);
        if(!cachedFile){
            cachedFile = await lib.getDimensions(filePath);
            this.sequence._addFileToCache(filePath, cachedFile)
        }
        return cachedFile;
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

    _calculateMissedPosition(target, missed){

        let position = {
            x: target?.center?.x ?? target.x,
            y: target?.center?.y ?? target.y
        }

        if(!missed){
            return position;
        }

        let width = (target?.data?.width ?? 1) * canvas.grid.size;
        let height = (target?.data?.height ?? 1) * canvas.grid.size;

        let XorY = Math.random() < 0.5 ? true : false;
        let flipX = Math.random() < 0.5 ? -1 : 1;
        let flipY = Math.random() < 0.5 ? -1 : 1;

        let tokenOffset = canvas.grid.size / 5;

        // If it's X, random position in Y axis
        if(XorY){
            position.x += ((width/2) + lib.random_float_between(tokenOffset, canvas.grid.size/2)) * flipX;
            position.y += lib.random_float_between(tokenOffset, (height/2) + canvas.grid.size/2) * flipY;
        }else{
            position.x += lib.random_float_between(tokenOffset, (width/2) + canvas.grid.size/2) * flipX;
            position.y += ((height/2) + lib.random_float_between(tokenOffset, canvas.grid.size/2)) * flipY;
        }

        return position;

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
        if(typeof inBaseFolder !== "string") throw new Error("inBaseFolder must be of type string");
        if(!inBaseFolder.endsWith("/") || !inBaseFolder.endsWith("\\")){
            inBaseFolder = inBaseFolder.replace("\\", "/");
            inBaseFolder += "/";
        }
        this._baseFolder = inBaseFolder;
        return this;
    }

    file(inFile) {
        if(Array.isArray(inFile)){
            inFile = lib.random_array_element(inFile)
        }
        if(typeof inFile !== "string") throw new Error("inFile must be of type string");
        this._file = inFile;
        return this;
    }

    delay(msMin, msMax) {
        if(typeof msMin !== "number") throw new Error("msMin must be of type number");
        let delay = msMin;
        if(msMax){
            if(typeof msMax !== "number") throw new Error("msMax must be of type number");
            msMax = Math.max(msMin, msMax);
            delay = lib.random_float_between(msMin, msMax);
        }
        this._delay = delay;
        return this;
    }

    moves(inBool = true) {
        if(typeof inBool !== "boolean") throw new Error("inBool must be of type boolean");
        this._moves = inBool;
        return this;
    }

    stretch(inBool = true) {
        if(typeof inBool !== "boolean") throw new Error("inBool must be of type boolean");
        this._stretch = inBool;
        return this;
    }

    missed(inBool = true){
        if(typeof inBool !== "boolean") throw new Error("inBool must be of type boolean");
        this._missed = inBool;
        return this;
    }

    JB2A(inBool = true){
        if(typeof inBool !== "boolean") throw new Error("inBool must be of type boolean");
        if(inBool){
            this.gridSize(100);
            this.startPoint(200);
            this.endPoint(200);
        }else{
            this.gridSize(canvas.grid.size);
            this.startPoint(0);
            this.endPoint(0);
        }
        this._JB2A = true;
        return this;
    }

    addOverride(inFunc){
        if(!lib.is_function(inFunc)) throw new Error("The given function needs to be an actual function.");
        this._overrides.push(inFunc);
        return this;
    }

    addPostOverride(inFunc){
        if(!lib.is_function(inFunc)) throw new Error("The given function needs to be an actual function.");
        this._postOverrides.push(inFunc);
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

    rotateTowards(inLocation) {
        this._to = this._validateLocation(inLocation);
        this._rotationOnly = true;
        return this;
    }

    reachTowards(inLocation) {
        this._to = this._validateLocation(inLocation);
        this._rotationOnly = false;
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

    scale(inScaleMin, inScaleMax) {
        let scale = inScaleMin;
        if (typeof inScaleMin === "number") {
            if(inScaleMax && typeof inScaleMax === "number"){
                scale = lib.random_float_between(inScaleMin, inScaleMax);
            }
            scale = {
                x: scale,
                y: scale
            }
        }

        this._scale = scale;
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

    randomRotation(inBool = true) {
        if(typeof inBool !== "boolean") throw new Error("inBool must be of type boolean");
        this._randomRotation = inBool;
        return this;
    }

    randomizeMirrorX(inBool = true){
        if(typeof inBool !== "boolean") throw new Error("inBool must be of type boolean");
        this._randomX = true;
        return this;
    }

    randomizeMirrorY(inBool = true){
        if(typeof inBool !== "boolean") throw new Error("inBool must be of type boolean");
        this._randomY = true;
        return this;
    }

    gridSize(inSize){
        if(typeof inSize !== "number") throw new Error("inSize must be of type number");
        this._gridSize = inSize;
        return this;
    }

    run() {
        let self = this;
        return new Promise(async (resolve) => {
            setTimeout(async function () {
                let effect = await self._sanitizeEffect();
                game.socket.emit("module.fxmaster", effect);
                await canvas.fxmaster.playVideo(effect);
                resolve();
            }, self._delay);
        });
    }

}

class SoundSection extends Section{

    constructor(inSequence, inFile="") {
        super(inSequence)
        this.file(inFile);
        this._delay = 0;
        this._volume = 0.8;
    }

    _sanitizeSound(){
        return {
            src: [this._file],
            volume: this._volume ?? 0.8,
            autoplay: true,
            loop: false
        };
    }

    file(inFile) {
        if(Array.isArray(inFile)){
            inFile = lib.random_array_element(inFile)
        }
        if(typeof inFile !== "string") throw new Error("inFile must be of type string");
        this._file = inFile;
        return this;
    }

    volume(inVolume){
        if(typeof inVolume !== "number") throw new Error("inVolume must be of type number");
        this._volume = Math.max(0, Math.min(1.0, inVolume));
        return this;
    }

    delay(msMin, msMax) {
        if(typeof ms !== "number") throw new Error("ms must be of type number");
        let delay = msMin;
        if(msMax && typeof msMax === "number"){
            msMax = Math.max(msMin, msMax);
            delay = lib.random_float_between(msMin, msMax);
        }
        this._delay = delay;
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