import * as lib from "../lib.js";
import { emitSocketEvent, playEffect, SOCKET_HANDLERS } from "../../sockets.js";
import AnimatedSection from "./animated.js";
import {random_object_element} from "../lib.js";

export default class EffectSection extends AnimatedSection {

    constructor(inSequence, inFile="") {
        super(inSequence)
        this.file(inFile);
        this._baseFolder = "";
        this._from = false;
        this._to = false;
        this._scaleMin = false;
        this._scaleMax = false;
        this._anchor = false;
        this._randomRotation = false;
        this._rotationOnly = true;
        this._moves = false;
        this._missed = false;
        this._startPoint = 0;
        this._endPoint = 0;
        this._JB2A = false;
        this._randomMirrorX = false;
        this._randomMirrorY = false;
        this._mirrorX = false;
        this._mirrorY = false;
        this._playbackRate = 1.0;
        this._gridSize = 100;
        this._overrides = [];
        this._name = false;
        this._scaleIn = false;
        this._scaleOut = false;
        this._layer = 2;
        this._zIndex = 0;
        this._offset = false;
    }

    /**
     * Causes the effect's position to be stored and can then be used  with .atLocation(), .reachTowards(),
     * and .rotateTowards() to refer to previous effects' locations
     *
     * @param {boolean} inName
     * @returns {EffectSection} this
     */
    name(inName){
        if(typeof inName !== "string") this.sequence.throwError(this, "name", "inBaseFolder must be of type string");
        this._name = inName;
        return this;
    }

    /**
     * Defines the base folder that will prepend to the file path. This is mainly just useful to make the file
     * path easier to manage.
     *
     * @param {string} inBaseFolder
     * @returns {EffectSection} this
     */
    baseFolder(inBaseFolder) {
        if(typeof inBaseFolder !== "string") this.sequence.throwError(this, "baseFolder", "inBaseFolder must be of type string");
        inBaseFolder = inBaseFolder.replace("\\", "/");
        if(!inBaseFolder.endsWith("/")) {
            inBaseFolder += "/";
        }
        this._baseFolder = inBaseFolder;
        return this;
    }

    /**
     * Declares which .webm to be played This may also be an array of paths, which will be randomly picked from each
     * time the effect is played.
     *
     * @param {string|array} inFile
     * @returns {EffectSection} this
     */
    file(inFile) {
        this._file = inFile;
        return this;
    }

    /**
     * Sets the effect's playback rate. A playback rate of 2.0 would make it play 2x as fast, 0.5 would make
     * it play half as fast.
     *
     * @param {number} inNumber
     * @returns {EffectSection} this
     */
    playbackRate(inNumber = 1.0) {
        if(typeof inNumber !== "number") this.sequence.throwError(this, "playbackRate", "inNumber must be of type number");
        this._playbackRate = inNumber;
        return this;
    }

    /**
     * Causes the effect to target a location close to the .reachTowards() location, but not on it.
     *
     * @param {boolean} [inBool=true] inBool
     * @returns {EffectSection} this
     */
    missed(inBool = true) {
        if(typeof inBool !== "boolean") this.sequence.throwError(this, "missed", "inBool must be of type boolean");
        this._missed = inBool;
        return this;
    }

    /**
     * Sets the start point and end point to best work JB2A's effect sprites. This depends on the type of the effect, which
     * the Sequencer figures out from the path.
     *
     * An optional boolean parameter can be provided in order to make the
     *
     * @returns {EffectSection} this
     */
    JB2A() {
        this._JB2A = true;
        return this;
    }

    /**
     * Adds a function that will run at the end of the effect serialization step, but before it is played. Allows direct
     * modifications of effect's data. For example, it could be manipulated to change which file will be used based
     * on the distance to the target.
     *
     * @param {function} inFunc
     * @returns {EffectSection} this
     */
    addOverride(inFunc) {
        if(!lib.is_function(inFunc)) this.sequence.throwError(this, "addOverride", "The given function needs to be an actual function.");
        this._overrides.push(inFunc);
        return this;
    }

    /**
     *  A smart method that can take a reference to an object, or a direct on the canvas to play the effect at,
     *  or a string reference (see .name())
     *
     * @param {object|string} inLocation
     * @returns {EffectSection} this
     */
    atLocation(inLocation) {
        if(inLocation === undefined) this.sequence.throwError(this, "atLocation", "inLocation must not be undefined");
        inLocation = this._validateLocation(inLocation);
        if(inLocation === undefined) this.sequence.throwError(this, "atLocation", "could not find position of given object");
        this._from = inLocation;
        return this;
    }

    /**
     *  Causes the effect to be rotated towards the given token, template, or a direct on the canvas to play the effect at, or a string reference (see .name())
     *
     * @param {object|string} inLocation
     * @returns {EffectSection} this
     */
    rotateTowards(inLocation) {
        if(inLocation === undefined) this.sequence.throwError(this, "rotateTowards", "inLocation must not be undefined");
        inLocation = this._validateLocation(inLocation);
        if(inLocation === undefined) this.sequence.throwError(this, "rotateTowards", "could not find position of given object");
        this._to = inLocation;
        this._rotationOnly = true;
        this._moves = false;
        return this;
    }

    /**
     *  Causes the effect to be rotated and stretched towards an object, or a direct on the canvas to play the effect at, or a string reference (see .name())
     *  This effectively calculates the proper X scale for the effect to reach the target
     *
     * @param {object|string} inLocation
     * @returns {EffectSection} this
     */
    reachTowards(inLocation) {
        if(inLocation === undefined) this.sequence.throwError(this, "reachTowards", "inLocation must not be undefined");
        inLocation = this._validateLocation(inLocation);
        if(inLocation === undefined) this.sequence.throwError(this, "rotateTowards", "could not find position of given object");
        this._to = inLocation;
        this._rotationOnly = false;
        this._moves = false;
        return this;
    }

    /**
     *  Causes the effect to move towards an object, or a direct on the canvas to play the effect at, or a string reference (see .name())
     *
     * @param {object|string} inLocation
     * @param {object} options
     * @returns {EffectSection} this
     */
    moveTowards(inLocation, options={}) {
        if(inLocation === undefined) this.sequence.throwError(this, "moveTowards", "inLocation must not be undefined");
        if(typeof options !== "object") this.sequence.throwError(this, "moveTowards", "options must be of type object");
        let mergeFunc = this.version ? foundry.utils.mergeObject : mergeObject;
        options = mergeFunc({
            ease: "linear",
            delay: 0
        }, options);
        if(typeof options.ease !== "string") this.sequence.throwError(this, "moveTowards", "options.ease must be of type string");
        inLocation = this._validateLocation(inLocation);
        if(inLocation === undefined) this.sequence.throwError(this, "rotateTowards", "could not find position of given object");
        this._to = inLocation;
        this._moves = options;
        this._rotationOnly = true;
        return this;
    }

    /**
     *  Causes the effect to be offset relative to its location based on a given vector
     *
     * @param {object} inOffset
     * @param {object} options
     * @returns {EffectSection} this
     */
    offset(inOffset, options = {}){
        if(inOffset === undefined) this.sequence.throwError(this, "offset", "inOffset must not be undefined");
        if(typeof options !== "object") this.sequence.throwError(this, "offset", "options must be of type object");
        let mergeFunc = this.version ? foundry.utils.mergeObject : mergeObject;
        inOffset = mergeFunc({
            x: 0,
            y: 0,
            local: false
        }, inOffset);
        inOffset = mergeFunc(inOffset, options);
        if(typeof inOffset.local !== "boolean") this.sequence.throwError(this, "offset", "options.local must be of type boolean");
        this._offset = inOffset;
        return this;
    }

    /**
     *  Defines the start point within the given sprite, starting from the left of the sprite. An example
     *  would be a given number of `200` - means that the sprite will consider 200 pixels into the sprite as the
     *  'anchor point'
     *
     * @param {number} inStartPoint
     * @returns {EffectSection} this
     */
    startPoint(inStartPoint) {
        if(typeof inStartPoint !== "number") this.sequence.throwError(this, "startPoint", "inStartPoint must be of type number");
        this._startPoint = inStartPoint;
        return this;
    }

    /**
     *  The same as the start point, except from the right and how many pixels to offset the target from
     *
     * @param {number} inEndPoint
     * @returns {EffectSection} this
     */
    endPoint(inEndPoint) {
        if(typeof inEndPoint !== "number") this.sequence.throwError(this, "endPoint", "inEndPoint must be of type number");
        this._endPoint = inEndPoint;
        return this;
    }

    /**
     *  A method that can take the following:
     *  - A number to set the scale uniformly
     *  - An object with x and y for non-uniform scaling
     *  - Two numbers which the Sequencer will randomly pick a uniform scale between
     *
     * @param {number|object} inScaleMin
     * @param {number} [inScaleMax] inScaleMax
     * @returns {EffectSection} this
     */
    scale(inScaleMin, inScaleMax) {
        if(!(typeof inScaleMin === "number" || typeof inScaleMin === "object")) this.sequence.throwError(this, "scale", "inScale must be of type number or object");
        if (typeof inScaleMin !== "number") {
            if(inScaleMax && typeof inScaleMax === "number"){
                this.sequence.throwError(this, "scale", "if inScaleMin is a number, inScaleMax must also be of type number");
            }
        }
        this._scaleMin = inScaleMin;
        this._scaleMax = inScaleMax ?? false;
        return this;
    }

    /**
     *  Causes the effect to scale when it starts playing
     *
     * @param {number|object} scale
     * @param {number} duration
     * @param {object} [options] options
     * @returns {AnimatedSection} this
     */
    scaleIn(scale, duration, options={}){
        if(typeof options !== "object") this.sequence.throwError(this, "scaleIn", "options must be of type object");
        let mergeFunc = this.version ? foundry.utils.mergeObject : mergeObject;
        options = mergeFunc({
            ease: "linear",
            delay: 0
        }, options);
        if(typeof duration !== "number") this.sequence.throwError(this, "scaleIn", "duration must be of type number");
        if(!(typeof scale === "number" || typeof scale === "object")) this.sequence.throwError(this, "scaleIn", "scale must be of type number or object");
        if(typeof options.ease !== "string") this.sequence.throwError(this, "scaleIn", "options.ease must be of type string");
        if(typeof options.delay !== "number") this.sequence.throwError(this, "scaleIn", "options.delay must be of type number");
        this._scaleIn = {
            value: scale,
            duration: duration,
            ease: options.ease,
            delay: options.delay
        };
        return this;
    }

    /**
     *  Causes the effect to scale at the end of the effect's duration
     *
     * @param {number|object} scale
     * @param {number} duration
     * @param {object} [options] options
     * @returns {AnimatedSection} this
     */
    scaleOut(scale, duration, options={}){
        if(typeof options !== "object") this.sequence.throwError(this, "scaleOut", "options must be of type object");
        let mergeFunc = this.version ? foundry.utils.mergeObject : mergeObject;
        options = mergeFunc({
            ease: "linear",
            delay: 0
        }, options);
        if(typeof duration !== "number") this.sequence.throwError(this, "scaleOut", "duration must be of type number");
        if(!(typeof scale === "number" || typeof scale === "object")) this.sequence.throwError(this, "scaleOut", "scale must be of type number or object");
        if(typeof options.ease !== "string") this.sequence.throwError(this, "scaleOut", "options.ease must be of type string");
        if(typeof options.delay !== "number") this.sequence.throwError(this, "scaleOut", "options.delay must be of type number");
        this._scaleOut = {
            value: scale,
            duration: duration,
            ease: options.ease,
            delay: options.delay
        };
        return this;
    }

    /**
     *  Anchors the sprite according to the given x and y coordinates, or uniformly based on a single number
     *
     * @param {number|object} inAnchor
     * @returns {EffectSection} this
     */
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

    /**
     *  Centers the sprite, effectively giving it an anchor of {x: 0.5, y: 0.5}
     *
     *  Note: If this is used, it will override the anchor set by Aim Towards, which sets the sprite's anchor to the
     *  outermost edge of the location the sprite is played at
     *
     * @returns {EffectSection} this
     */
    center() {
        this.anchor();
        return this;
    }

    /**
     * The sprite gets a random rotation, which means it should not be used with .reachTowards()
     *
     * @param {boolean} [inBool=true] inBool
     * @returns {EffectSection} this
     */
    randomRotation() {
        this._randomRotation = true;
        return this;
    }

    /**
     * The sprite gets a randomized flipped X scale. If the scale on that axis was 1, it can
     * become 1 or -1, effectively mirroring the sprite on its horizontal axis
     *
     * @returns {EffectSection} this
     */
    randomizeMirrorX() {
        this._randomMirrorX = true;
        return this;
    }

    /**
     * The sprite gets a randomized flipped Y scale. If the scale on that axis was 1, it can
     * become 1 or -1, effectively mirroring the sprite on its vertical axis
     *
     * @returns {EffectSection} this
     */
    randomizeMirrorY() {
        this._randomMirrorY = true;
        return this;
    }

    /**
     * The sprite gets a flipped X scale. If the scale on that axis was 1, it will become become 1 or -1, effectively
     * mirroring the sprite on its horizontal axis
     *
     * @param {boolean} inBool
     * @returns {EffectSection} this
     */
    mirrorX(inBool = true) {
        if(typeof inBool !== "boolean") this.sequence.throwError(this, "mirrorX", "inBool must be of type boolean");
        this._mirrorX = inBool;
        return this;
    }

    /**
     * The sprite gets a flipped Y scale. If the scale on that axis was 1, it will become become 1 or -1, effectively
     * mirroring the sprite on its vertical axis
     *
     * @param {boolean} inBool
     * @returns {EffectSection} this
     */
    mirrorY(inBool = true) {
        if(typeof inBool !== "boolean") this.sequence.throwError(this, "mirrorY", "inBool must be of type boolean");
        this._mirrorY = inBool;
        return this;
    }

    /**
     * Sets the grid size of the file loaded in the Effect. Some files have an established internal
     * grid, so this will make the effect scale up or down to match the active scene's grid size
     *
     * @param {number} inGridSize
     * @returns {EffectSection} this
     */
    gridSize(inGridSize) {
        if(typeof inGridSize !== "number") this.sequence.throwError(this, "gridSize", "inGridSize must be of type number");
        this._gridSize = inGridSize;
        return this;
    }

    /**
     * Causes the effect to be played below tokens
     *
     * @param {boolean} [inBool=true] inBool
     * @returns {EffectSection} this
     */
    belowTokens(inBool = true){
        if(typeof inBool !== "boolean") this.sequence.throwError(this, "belowTokens", "inBool must be of type boolean");
        this._layer = inBool ? 1 : 2;
        return this;
    }

    /**
     * Causes the effect to be played below tiles
     *
     * @param {boolean} [inBool=true] inBool
     * @returns {EffectSection} this
     */
    belowTiles(inBool = true){
        if(typeof inBool !== "boolean") this.sequence.throwError(this, "belowTiles", "inBool must be of type boolean");
        this._layer = inBool ? 0 : 2;
        return this;
    }

    /**
     * Sets the zIndex of the effect, potentially displaying it on top of other effects
     *
     * @param {number} inZIndex
     * @returns {EffectSection} this
     */
    zIndex(inZIndex){
        if(typeof inZIndex !== "number") this.sequence.throwError(this, "zIndex", "inZIndex must be of type number");
        this._zIndex = inZIndex;
        return this;
    }

    get gridSizeDifference(){
        return canvas.grid.size / this._gridSize;
    }

    async _run() {
        let effect = await this._sanitizeEffectData();
        emitSocketEvent(SOCKET_HANDLERS.PLAY_EFFECT, effect);
        let canvasEffectData = await playEffect(effect);
        this.animationDuration = canvasEffectData.duration;
        await new Promise(resolve => setTimeout(resolve, this.animationDuration + this._waitUntilFinishedDelay))
    }

    async _sanitizeEffectData() {

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
            angle: this._angle,
            rotation: 0,
            speed: 0,
            playbackRate: this._playbackRate,
            _distance: 0,
            duration: this._duration,
            layer: this._layer,
            index: this._index,
            zIndex: this._zIndex,
            opacity: typeof this._opacity === "number" ? this._opacity : 1.0,
            audioVolume: this._volume,
            animatedProperties: {
                fadeIn: this._fadeIn,
                fadeOut: this._fadeOut,
                scaleIn: this._scaleIn,
                scaleOut: this._scaleOut,
                rotateIn: this._rotateIn,
                rotateOut: this._rotateOut,
                moves: this._moves,
                fadeInAudio: this._fadeInAudio,
                fadeOutAudio: this._fadeOutAudio
            },
            debug: this.sequence.debug
        };

        if(this._anchor) data.anchor = this._anchor;

        data = this._determineTargets(data);

        data.rotation += this._randomRotation ? Math.random() * Math.PI : 0;

        for(let override of this._overrides) {
            data = await override(this, data);
        }

        data = this._determineFile(data);

        if(this._JB2A){
            let [gridSize, startPoint, endPoint] = {
                "ranged": [100, 200, 200],
                "melee": [100, 300, 300],
                "cone": [100, 0, 0]
            }[this._getJB2ATemplate(data.file)];

            this._gridSize = gridSize;
            this._startPoint = startPoint;
            this._endPoint = endPoint;
        }

        data.scale = {
            x: data.scale.x * this.gridSizeDifference,
            y: data.scale.y * this.gridSizeDifference
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

        if(!this._rotationOnly) {
            data = await this._calculateHitVector(data);
        }

        let flipX = this._mirrorX || (this._randomMirrorX && Math.random() < 0.5) ? -1 : 1;
        data.scale.x = data.scale.x * flipX;

        let flipY = this._mirrorY || (this._randomMirrorY && Math.random() < 0.5) ? -1 : 1;
        data.scale.y = data.scale.y * flipY;

        if(typeof data.file !== "string") {
            this.sequence.throwError(this, "file", "inFile must be of type string or array");
        }

        return data;

    }

    _determineTargets(data){

        if (this._from) {

            let [from, to, origin, target] = this._getPositions(this._from, this._to);

            if(this._offset) {
                let offset = this._offset;
                if(this._offset.local){
                    let target = to || from;
                    if(target?.data?.rotation) offset = lib.rotateVector(offset, target.data.rotation);
                }
                if(to){
                    target.x -= offset.x;
                    target.y -= offset.y;
                }else{
                    origin.x -= offset.x;
                    origin.y -= offset.y;
                }
            }

            if(this._to){
                target = this._applyMissedOffsets(target);
            }else{
                origin = this._applyMissedOffsets(origin);
            }

            if(!this._anchor && (from instanceof Token || from instanceof Tile)) {
                data.anchor = {
                    x: 0.5,
                    y: 0.5
                }
            }

            data.position = origin;

            if(this._to) {

                if(!this._anchor) {
                    data.anchor = {
                        x: 0.0,
                        y: 0.5
                    }
                }

                let ray = new Ray(origin, target);

                data._distance = ray.distance;

                data.rotation = ray.angle;

                if(this._moves) {
                    data.distance = ray.distance;
                    if(!this._anchor) {
                        data.anchor = {
                            x: 0.5,
                            y: 0.5
                        }
                    }
                    data.speed = this._moveSpeed;
                }

            }

        }

        return data;
    }

    _determineFile(data){

        if(typeof data.file === "string") {
            if (this._mustache) {
                let template = Handlebars.compile(data.file);
                data.file = template(this._mustache);
            }
        }

        if(Array.isArray(data.file)) data.file = lib.random_array_element(data.file);

        let forcedIndex = false;
        let databaseEntry = window.SequencerDatabase.entryExists(data.file);
        if(databaseEntry){
            let match = data.file.match(/\[([0-9]+)]$/)
            if(match) {
                forcedIndex = Number(match[1]);
                data.file = data.file.replace(/\[[0-9]+]$/, "");
            }
            data.file = window.SequencerDatabase.get(data.file) || data.file;
            data = this.evaluateDatabaseEntry(data);
        }

        if(Array.isArray(data.file)) {
            data.file = typeof forcedIndex !== "number" ? lib.random_array_element(data.file) : data.file[forcedIndex % data.file.length];
        }

        if(typeof data.file === "string") {
            data.file = data.file.startsWith(this._baseFolder) ? data.file : this._baseFolder + data.file;
            if (this._mustache) {
                let template = Handlebars.compile(data.file);
                data.file = template(this._mustache);
            }
        }

        return data;

    }

    get distanceMatching(){
        return {
            "90ft": 1500,
            "60ft": 900,
            "30ft": 500,
            "15ft": 200,
            "05ft": 0
        }
    }

    evaluateDatabaseEntry(data){
        if(typeof data.file !== "object") return data;
        return this._recurseDatabaseFiles(data);
    }

    _recurseDatabaseFiles(data){
        if(typeof data.file === "string" || Array.isArray(data.file)) return data;

        if(this._to && !this._rotationOnly) {
            let foundDistances = Object.keys(data.file).filter(entry => Object.keys(this.distanceMatching).indexOf(entry) > -1).length !== 0;
            if(foundDistances) return this._rangeFind(data);
        }

        data.file = random_object_element(data.file);

        return this._recurseDatabaseFiles(data);
    }

    _rangeFind(data){

        let distances = Object.keys(data.file)
            .filter(entry => Object.keys(this.distanceMatching).indexOf(entry) > -1)
            .map(entry => { return {
                file: data.file[entry],
                minDistance: this.distanceMatching[entry]
            }});

        let uniqueDistances = [...new Set(distances.map(item => item.minDistance))];
        uniqueDistances.sort((a, b) => a - b);

        let max = Math.max(...uniqueDistances);
        let min = Math.min(...uniqueDistances);

        let relativeDistance = data._distance / this.gridSizeDifference;

        data.file = distances
            .map(entry => {
                entry.distances = [
                    entry.minDistance === min ? 0 : entry.minDistance,
                    entry.minDistance === max ? Infinity : uniqueDistances[uniqueDistances.indexOf(entry.minDistance)+1]
                ];
                return entry;
            })
            .find(e => relativeDistance >= e.distances[0] && relativeDistance < e.distances[1])
            .file;

        return data;
    }

    _getJB2ATemplate(inFile){
        if(inFile.toLowerCase().includes("/melee/") || inFile.toLowerCase().includes("/unarmed_attacks/")){
            return "melee";
        }else if(inFile.toLowerCase().includes("/cone/") || inFile.toLowerCase().includes("_cone_")){
            return "cone";
        }
        return "ranged";
    }

    async _getFileDimensions(inFile) {
        let filePath = inFile.startsWith(this._baseFolder) ? inFile : this._baseFolder + inFile;
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
        let trueDistanceAfterMargin = this._getTrueLength(dimensions);

        data.scale.x = data._distance / trueDistanceAfterMargin;
        data.scale.y = data._distance / trueDistanceAfterMargin;

        data.anchor.x = this._startPoint / dimensions.x;

        return data;
    }

    _getCleanPosition(obj, measure = false){

        let pos = {
            x: obj?.x ?? 0,
            y: obj?.y ?? 0
        }

        if(obj instanceof MeasuredTemplate){
            if(measure){
                if(obj.data.t === "cone" || obj.data.t === "ray"){
                    pos.x = obj.ray.B.x;
                    pos.y = obj.ray.B.y;
                }
            }
            if(obj.data.t === "rect"){
                pos.x = obj.x + (obj.shape.width/2)
                pos.y = obj.y + (obj.shape.height/2)
            }
        }else if(obj instanceof Token){
            pos.x = obj.x + (obj.hitArea.width)/2;
            pos.y = obj.y + (obj.hitArea.height)/2;
        }

        return pos;
    }

    _getPositions(from, to, applyOffsets = true) {

        let from_offset = { x: 0, y: 0 };
        if(typeof from === "string"){
            let cachedFrom = this.sequence._getCachedOffset(from, this._currentRepetition);
            from = cachedFrom.object;
            from_offset = cachedFrom.offset;
            if(cachedFrom.extraOffset && applyOffsets){
                from_offset.x += cachedFrom.extraOffset.x;
                from_offset.y += cachedFrom.extraOffset.y;
            }
        }

        let to_offset = { x: 0, y: 0 };
        if(typeof to === "string"){
            let cachedTo = this.sequence._getCachedOffset(to, this._currentRepetition);
            to = cachedTo.object;
            to_offset = cachedTo.offset;
            if(cachedTo.extraOffset && applyOffsets){
                to_offset.x += cachedTo.extraOffset.x;
                to_offset.y += cachedTo.extraOffset.y;
            }
        }

        let from_position = this._getCleanPosition(from);
        let to_position = this._getCleanPosition(to, true);

        from_position.x -= from_offset.x;
        from_position.y -= from_offset.y;

        if(to){
            to_position.x -= to_offset.x;
            to_position.y -= to_offset.y;
        }

        return [from, to, from_position, to_position];

    }

    _applyMissedOffsets(inPosition){
        let offset = this._offsets[this._currentRepetition] ?? { x: 0, y: 0 };
        inPosition.x -= offset.x;
        inPosition.y -= offset.y;
        return inPosition;
    }

    async _cacheOffsets(){

        let [from, to, from_target, to_target] = this._getPositions(this._from, this._to, false);

        from_target = this._calculateMissedPosition(from, from_target, !this._to && this._missed);
        to_target = to ? this._calculateMissedPosition(to, to_target, this._missed) : false;

        let from_origin = this._getCleanPosition(from);
        let to_origin = this._getCleanPosition(to, true);

        let origin_object = to || from;
        let origin_position = to ? to_origin : from_origin;
        let target_position = to ? to_target : from_target;

        let offset = {
            x: origin_position.x - target_position.x,
            y: origin_position.y - target_position.y
        }

        if(this._missed) {
            this._offsets.push(offset);
        }

        if(this._name) {

            this.sequence._insertCachedOffset(
                this._name,
                origin_object,
                offset,
                this._offset
            );
        }

    }

    _calculateMissedPosition(target, position, missed){

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

}