import * as lib from "../lib.js";
import Section from "./base.js";

export default class EffectSection extends Section {

    constructor(inSequence, inFile="") {
        super(inSequence)
        this.file(inFile);
        this._baseFolder = "";
        this._from = false;
        this._to = false;
        this._moves = false;
        this._stretch = false;
        this._scaleMin = false;
        this._scaleMax = false;
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
        this._playbackRate = 1.0;
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
            playbackRate: this._playbackRate,
            _distance: 0
        };

        if(this._anchor) {
            data.anchor = this._anchor;
        }

        if (this._from) {

            let origin = this._calculateMissedPosition(this._from, !this._to && this._missed);

            if(!this._anchor) {
                data.anchor = {
                    x: 0.5,
                    y: 0.5
                }
            }

            if(this._to) {

                let target = this._calculateMissedPosition(this._to, this._missed);

                if(!this._anchor) {
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

        for(let override of this._overrides) {
            data = await override(this, data);
        }

        if(Array.isArray(data.file)) {
            data.file = lib.random_array_element(data.file)
        }

        if(this._mustache) {
            let template = Handlebars.compile(data.file);
            data.file = template(this._mustache);
        }

        if(!this._rotationOnly) {
            data = await this._calculateHitVector(data);
        }

        data.scale = {
            x: data.scale.x * (canvas.grid.size / this._gridSize),
            y: data.scale.y * (canvas.grid.size / this._gridSize)
        }

        let scale = this._scaleMin;
        if (typeof this._scaleMin === "number") {
            if(this._scaleMax && typeof this._scaleMax === "number"){
                scale = lib.random_float_between(this._scaleMin, this._scaleMax);
            }
            scale = {
                x: scale,
                y: scale
            }
        }

        data.scale = {
            x: data.scale.x * (scale?.x ?? 1.0),
            y: data.scale.y * (scale?.y ?? 1.0)
        }

        let flipX = this._randomX && Math.random() < 0.5 ? -1 : 1;
        data.scale.x = data.scale.x * flipX;

        let flipY = this._randomY && Math.random() < 0.5 ? -1 : 1;
        data.scale.y = data.scale.y * flipY;

        data.file = (this._baseFolder + data.file);

        for(let override of this._postOverrides) {
            data = await override(this, data);
        }

        return data;

    }

    async _getFileDimensions(inFile) {
        let filePath = this._baseFolder + inFile;
        if(this._JB2A) {
            let parts = filePath.replace(".webm", "").split("_");
            let dimensionString = parts[parts.length-1].toLowerCase().split('x');
            if(!isNaN(dimensionString[0]) && !isNaN(dimensionString[1])) {
                return {
                    x: Number(dimensionString[0]),
                    y: Number(dimensionString[1])
                }
            }
        }
        let cachedFile = this.sequence._getFileFromCache(filePath);
        if(!cachedFile) {
            cachedFile = await lib.getDimensions(filePath);
            this.sequence._addFileToCache(filePath, cachedFile)
        }
        return cachedFile;
    }

    _getTrueLength(inDimensions) {
        return inDimensions.x - this._startPoint - this._endPoint;
    }

    async _calculateHitVector(data) {

        if(data._distance === 0) return data;

        let dimensions = await this._getFileDimensions(data.file);
        let trueLength = this._getTrueLength(dimensions);

        data.scale.x = data._distance / trueLength;
        data.scale.y = Math.max(0.4, data.scale.x);

        data.anchor.x = this._startPoint / dimensions.x;

        return data;
    }

    _calculateMissedPosition(target, missed) {

        let position = {
            x: target?.center?.x ?? target.x,
            y: target?.center?.y ?? target.y
        }

        if(!missed) return position;

        let width = (target?.data?.width ?? 1) * canvas.grid.size;
        let height = (target?.data?.height ?? 1) * canvas.grid.size;

        let XorY = Math.random() < 0.5;
        let flipX = Math.random() < 0.5 ? -1 : 1;
        let flipY = Math.random() < 0.5 ? -1 : 1;

        let tokenOffset = canvas.grid.size / 5;

        // If it's X, random position in Y axis
        if(XorY) {
            position.x += ((width/2) + lib.random_float_between(tokenOffset, canvas.grid.size/2)) * flipX;
            position.y += lib.random_float_between(tokenOffset, (height/2) + canvas.grid.size/2) * flipY;
        }else{
            position.x += lib.random_float_between(tokenOffset, (width/2) + canvas.grid.size/2) * flipX;
            position.y += ((height/2) + lib.random_float_between(tokenOffset, canvas.grid.size/2)) * flipY;
        }

        return position;

    }

    _validateLocation(inLocation) {

        if(inLocation?._id) {
            inLocation = canvas.tokens.get(inLocation._id) ?? inLocation;
        }

        if (inLocation instanceof Token) return inLocation;

        return {
            x: inLocation?.x ?? 0,
            y: inLocation?.y ?? 0
        }

    }

    baseFolder(inBaseFolder) {
        if(typeof inBaseFolder !== "string") throw new Error("inBaseFolder must be of type string");
        if(!inBaseFolder.endsWith("/") || !inBaseFolder.endsWith("\\")) {
            inBaseFolder = inBaseFolder.replace("\\", "/");
            inBaseFolder += "/";
        }
        this._baseFolder = inBaseFolder;
        return this;
    }

    file(inFile) {
        if(!(typeof inFile === "string" || Array.isArray(inFile))) throw new Error("inFile must be of type string or array");
        this._file = inFile;
        return this;
    }

    playbackRate(inNumber = 1.0) {
        if(typeof inNumber !== "number") throw new Error("inNumber must be of type number");
        this._playbackRate = inNumber;
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

    missed(inBool = true) {
        if(typeof inBool !== "boolean") throw new Error("inBool must be of type boolean");
        this._missed = inBool;
        return this;
    }

    JB2A(inBool = true) {
        if(typeof inBool !== "boolean") throw new Error("inBool must be of type boolean");
        if(inBool) {
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

    addOverride(inFunc) {
        if(!lib.is_function(inFunc)) throw new Error("The given function needs to be an actual function.");
        this._overrides.push(inFunc);
        return this;
    }

    addPostOverride(inFunc) {
        if(!lib.is_function(inFunc)) throw new Error("The given function needs to be an actual function.");
        this._postOverrides.push(inFunc);
        return this;
    }

    setMustache(inMustache) {
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

    startPoint(inStartPoint) {
        if(typeof inStartPoint !== "number") throw new Error("inStartPoint must be of type number");
        this._startPoint = inStartPoint;
        return this;
    }

    endPoint(inEndPoint) {
        if(typeof inEndPoint !== "number") throw new Error("inEndPoint must be of type number");
        this._endPoint = inEndPoint;
        return this;
    }

    scale(inScaleMin, inScaleMax) {
        if (typeof inScaleMin !== "number") {
            if(inScaleMax && typeof inScaleMax === "number") throw new Error("if inScaleMax is a number, inScaleMin must also be of type number");
        }
        this._scaleMin = inScaleMin;
        this._scaleMax = inScaleMax;
        return this;
    }

    anchor(inAnchor) {
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

    randomizeMirrorX(inBool = true) {
        if(typeof inBool !== "boolean") throw new Error("inBool must be of type boolean");
        this._randomX = true;
        return this;
    }

    randomizeMirrorY(inBool = true) {
        if(typeof inBool !== "boolean") throw new Error("inBool must be of type boolean");
        this._randomY = true;
        return this;
    }

    gridSize(inSize) {
        if(typeof inSize !== "number") throw new Error("inSize must be of type number");
        this._gridSize = inSize;
        return this;
    }

    async run() {
        let effect = await this._sanitizeEffect();
        game.socket.emit("module.fxmaster", effect);
        await canvas.fxmaster.playVideo(effect);
    }

}
