import * as lib from "../lib.js";
import SequencerEffectHelper from "../sequencer-effect-helper.js";
import Section from "./section.js";

// Traits
import files from "./traits/files.js";
import audio from "./traits/audio.js";
import moves from "./traits/moves.js";
import opacity from "./traits/opacity.js";
import rotation from "./traits/rotation.js";
import scale from "./traits/scale.js";
import time from "./traits/time.js";

class EffectSection extends Section {

    constructor(inSequence, inFile="") {
        super(inSequence)
        this._file = inFile;
        this._from = false;
		this._reachTowards = false;
        this._anchor = false;
        this._randomOffset = false;
        this._missed = false;
        this._JB2A = false;
        this._randomMirrorX = false;
        this._randomMirrorY = false;
        this._mirrorX = false;
        this._mirrorY = false;
        this._playbackRate = 1.0;
        this._gridSize = 100;
        this._customTemplate = false;
		this._startPoint = 0;
		this._endPoint = 0;
        this._overrides = [];
        this._postOverrides = [];
        this._name = false;
        this._layer = 2;
        this._zIndex = 0;
        this._offset = false;
		this._distance = 0;
    }

    /**
     * Causes the effect's position to be stored and can then be used  with .atLocation(), .reachTowards(),
     * and .rotateTowards() to refer to previous effects' locations
     *
     * @param {string} inName
     * @returns {EffectSection} this
     */
    name(inName){
        if(typeof inName !== "string") this.sequence._throwError(this, "name", "inBaseFolder must be of type string");
        this._name = inName;
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
        if(typeof inNumber !== "number") this.sequence._throwError(this, "playbackRate", "inNumber must be of type number");
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
        if(typeof inBool !== "boolean") this.sequence._throwError(this, "missed", "inBool must be of type boolean");
        this._missed = inBool;
        return this;
    }

    /**
     * Sets the start point and end point to best work JB2A's effect sprites. This depends on the type of the effect, which
     * the Sequencer figures out from the path.
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
        if(!lib.is_function(inFunc)) this.sequence._throwError(this, "addOverride", "The given function needs to be an actual function.");
        this._overrides.push(inFunc);
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
    addPostOverride(inFunc) {
        if(!lib.is_function(inFunc)) this.sequence._throwError(this, "addPostOverride", "The given function needs to be an actual function.");
        this._postOverrides.push(inFunc);
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
        if(inLocation === undefined) this.sequence._throwError(this, "atLocation", "inLocation must not be undefined");
        inLocation = this._validateLocation(inLocation);
        if(inLocation === undefined) this.sequence._throwError(this, "atLocation", "could not find position of given object");
        this._from = inLocation;
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
        if(inLocation === undefined) this.sequence._throwError(this, "reachTowards", "inLocation must not be undefined");
        inLocation = this._validateLocation(inLocation);
        if(inLocation === undefined) this.sequence._throwError(this, "rotateTowards", "could not find position of given object");
        this._reachTowards = inLocation;
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
        if(inOffset === undefined) this.sequence._throwError(this, "offset", "inOffset must not be undefined");
        if(typeof options !== "object") this.sequence._throwError(this, "offset", "options must be of type object");
        inOffset = foundry.utils.mergeObject({
            x: 0,
            y: 0,
            local: false
        }, inOffset);
        inOffset = foundry.utils.mergeObject(inOffset, options);
        if(typeof inOffset.local !== "boolean") this.sequence._throwError(this, "offset", "options.local must be of type boolean");
        this._offset = inOffset;
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
		if(typeof inGridSize !== "number") this.sequence._throwError(this, "gridSize", "inGridSize must be of type number");
		this._gridSize = inGridSize;
		this._customTemplate = true;
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
        if(typeof inStartPoint !== "number") this.sequence._throwError(this, "startPoint", "inStartPoint must be of type number");
        this._startPoint = inStartPoint;
		this._customTemplate = true;
        return this;
    }

    /**
     *  The same as the start point, except from the right and how many pixels to offset the target from
     *
     * @param {number} inEndPoint
     * @returns {EffectSection} this
     */
    endPoint(inEndPoint) {
        if(typeof inEndPoint !== "number") this.sequence._throwError(this, "endPoint", "inEndPoint must be of type number");
        this._endPoint = inEndPoint;
		this._customTemplate = true;
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
        this.anchor(0.5);
        return this;
    }

    /**
     * The sprite gets a random offset on its target location, usually within the object's bounds. The optional parameter
     * scales how much offset should be added. Defaults to 1.0, which covers the entire target position, 0.5 would cover half.
     *
     * @param {number} [inOffsetScale=1.0] inOffsetScale
     * @returns {EffectSection} this
     */
    randomOffset(inOffsetScale = 1.0){
        if(typeof inOffsetScale !== "number") this.sequence._throwError(this, "randomOffset", "inBool must be of type number");
        this._randomOffset = inOffsetScale;
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
        if(typeof inBool !== "boolean") this.sequence._throwError(this, "mirrorX", "inBool must be of type boolean");
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
        if(typeof inBool !== "boolean") this.sequence._throwError(this, "mirrorY", "inBool must be of type boolean");
        this._mirrorY = inBool;
        return this;
    }

    /**
     * Causes the effect to be played below tokens
     *
     * @param {boolean} [inBool=true] inBool
     * @returns {EffectSection} this
     */
    belowTokens(inBool = true){
        if(typeof inBool !== "boolean") this.sequence._throwError(this, "belowTokens", "inBool must be of type boolean");
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
        if(typeof inBool !== "boolean") this.sequence._throwError(this, "belowTiles", "inBool must be of type boolean");
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
        if(typeof inZIndex !== "number") this.sequence._throwError(this, "zIndex", "inZIndex must be of type number");
        this._zIndex = inZIndex;
        return this;
    }

    get _to(){
		return this._reachTowards || this._rotateTowards?.target || this._moveTowards?.target || false;
	}

    async _run() {
        let data = await this._sanitizeEffectData();
        let canvasEffectData = await SequencerEffectHelper.play(data, true);
        this.animationDuration = canvasEffectData.duration;
        let totalDuration = this.animationDuration + this._currentWaitTime;
        await new Promise(resolve => setTimeout(resolve, totalDuration))
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
            gridSizeDifference: 1.0,
            angle: this._angle,
            rotation: 0,
            speed: 0,
            playbackRate: this._playbackRate,
            distance: 0,
            duration: this._duration,
            layer: this._layer,
            index: this.sequence.effectIndex,
            zIndex: this._zIndex,
            opacity: typeof this._opacity === "number" ? this._opacity : 1.0,
            audioVolume: this._volume,
            animatedProperties: {
                moves: this._moveTowards,
                fadeIn: this._fadeIn,
                fadeOut: this._fadeOut,
                scaleIn: this._scaleIn,
                scaleOut: this._scaleOut,
                rotateIn: this._rotateIn,
                rotateOut: this._rotateOut,
                fadeInAudio: this._fadeInAudio,
                fadeOutAudio: this._fadeOutAudio
            },
			time: false,
            debug: this.sequence.debug
        };

        if(this._anchor) data.anchor = this._anchor;

        data = this._determineTargets(data);

        data.rotation += this._randomRotation ? Math.random() * Math.PI : 0;

        for(let override of this._overrides) {
            data = await override(this, data);
        }

		let file = this._determineFile(data.file);
		let template;
        if(file instanceof lib.SequencerFile){
        	data.file = file.rangeFind ? this._rangeFind(file) : file.getFile();
        	template = file.template;
        	if(file.timeRange){
        		[this._startTime, this._endTime] = file.timeRange;
        		this._isRange = true;
			}
		}else{
        	data.file = file;
		}

        template = this._customTemplate ? this._determineTemplate(data.file) : (template ?? this._determineTemplate(data.file));

		this._gridSize = template[0];
		this._startPoint = template[1];
		this._endPoint = template[2];
		data.template = template;

		data.time = {
			start: typeof this._startTime === "number" ? {
				value: this._startTime,
				isPerc: this._startPerc
			} : false,
				end: typeof this._endTime === "number" ? {
				value: this._endTime,
				isPerc: this._endPerc
			} : false,
			isRange: this._isRange
		};

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

        if(this._reachTowards) {
            data = await this._calculateHitVector(data);
        }else{
            data.gridSizeDifference = this._gridSizeDifference(this._gridSize);
        }

        let flipX = this._mirrorX || (this._randomMirrorX && Math.random() < 0.5) ? -1 : 1;
        data.scale.x = data.scale.x * flipX;

        let flipY = this._mirrorY || (this._randomMirrorY && Math.random() < 0.5) ? -1 : 1;
        data.scale.y = data.scale.y * flipY;

		for(let override of this._postOverrides) {
			data = await override(this, data);
		}

        if(typeof data.file !== "string") {
            this.sequence._throwError(this, "file", "inFile must be of type string or array");
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
                target = this._applyOffsets(target);
            }else{
                origin = this._applyOffsets(origin);
            }

            if(!this._anchor) {
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

                this._distance = ray.distance;
                data.distance = this._distance;
                data._distance = this._distance;

                data.rotation = ray.angle;

                if(this._moveTowards) {

                    data.animatedProperties.moves.target = target;

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

    get _distanceMatching(){
        return {
            "90ft": 3000,
            "60ft": 1800,
            "30ft": 1000,
            "15ft": 400,
            "05ft": 0
        }
    }

    _rangeFind(inFile){

        let distances = Object.keys(inFile.file)
            .filter(entry => Object.keys(this._distanceMatching).indexOf(entry) > -1)
            .map(entry => {
            	let file = inFile.getFile(entry);
            	if(!file) this.sequence._throwError(this, "play", `Could not find index ${inFile.fileIndex} in database entry ${this._file}!`)
            	return {
					file: file,
					template: inFile.template ?? this._determineTemplate(file),
					minDistance: this._distanceMatching[entry]
				}
            });

        let uniqueDistances = [...new Set(distances.map(item => item.minDistance))];
        uniqueDistances.sort((a, b) => a - b);

        let max = Math.max(...uniqueDistances);
        let min = Math.min(...uniqueDistances);

        let possibleFiles = distances
            .map(entry => {
                entry.distances = {
                    min: entry.minDistance === min ? 0 : entry.minDistance,
                    max: entry.minDistance === max ? Infinity : uniqueDistances[uniqueDistances.indexOf(entry.minDistance) + 1]
                };
                entry.relativeDistance = this._distance / this._gridSizeDifference(entry.template[0]);
                return entry;
            })
            .filter(e => e.relativeDistance >= e.distances.min && e.relativeDistance < e.distances.max);

        return lib.random_array_element(possibleFiles).file;

    }

    _gridSizeDifference(inGridSize){
        return canvas.grid.size / inGridSize;
    }

    _determineTemplate(inFile){

    	if(!this._JB2A) return [this._gridSize, this._startPoint, this._endPoint];

		let type = "ranged";
		if (inFile.toLowerCase().includes("/melee/") || inFile.toLowerCase().includes("/unarmed_attacks/")) {
			type = "melee";
		} else if (inFile.toLowerCase().includes("/cone/") || inFile.toLowerCase().includes("_cone_")) {
			type = "cone";
		}
		return {
			"ranged": [200, 200, 200],
			"melee": [200, 300, 300],
			"cone": [200, 0, 0]
		}[type];
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

        if(data.distance === 0) return data;

        let dimensions = await this._getFileDimensions(data.file);
        let trueDistanceAfterMargin = this._getTrueLength(dimensions);

        data.scale.x = data.distance / trueDistanceAfterMargin;
        data.scale.y = data.distance / trueDistanceAfterMargin;

        data.anchor.x = this._startPoint / dimensions.x;

        return data;
    }

    _getCleanPosition(obj, measure = false){

        let pos = {};
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
        }else{
			pos = {
				x: obj?.x ?? obj?.position?.x ?? obj?.position?._x ?? obj?.data?.x ?? obj?.data?.position?.x ?? 0,
				y: obj?.y ?? obj?.position?.y ?? obj?.position?._y ?? obj?.data?.y ?? obj?.data?.position?.y ?? 0
			}

			if(obj instanceof Token){
				pos.x += (obj.hitArea.width)/2;
				pos.y += (obj.hitArea.height)/2;
			}
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

    _applyOffsets(inPosition){
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

        if(this._randomOffset){
            offset = this._getRandomOffset(to || from, offset)
        }

        this._offsets.push(offset);

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

    _getRandomOffset(target, position){

        let width = ((target?.data?.width ?? 1) * canvas.grid.size) * this._randomOffset;
        let height = ((target?.data?.height ?? 1) * canvas.grid.size) * this._randomOffset;

        position.x += lib.random_float_between((width/2) * -1, width/2);
        position.y += lib.random_float_between((height/2) * -1, height/2);

        return position;

    }

}

// Apply traits
Object.assign(EffectSection.prototype, files);
Object.assign(EffectSection.prototype, audio);
Object.assign(EffectSection.prototype, moves);
Object.assign(EffectSection.prototype, opacity);
Object.assign(EffectSection.prototype, rotation);
Object.assign(EffectSection.prototype, scale);
Object.assign(EffectSection.prototype, time);

export default EffectSection;