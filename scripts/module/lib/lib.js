import SequencerFileCache from "../sequencer-file-cache.js";

/**
 * This function is a backwards compatible method for both 0.8.9 and 9.224 that returns a boolean whether
 * you're on version 8 or 9
 *
 * @return {boolean}                    If the user is on version 9
 */
export function isVersion9(){
    return isNewerVersion((game?.version ?? game.data.version), "9.00");
}

/**
 * This function linearly interpolates between p1 and p2 based on a normalized value of t
 *
 * @param  {string}         inFile      The start value
 * @param  {object}         inOptions   The end value
 * @return {array|boolean}              Interpolated value
 */
export async function getFiles(inFile, { applyWildCard = false, softFail = false } = {}) {

    let source = 'data';
    const browseOptions = { wildcard: applyWildCard };

    if (/\.s3\./.test(inFile)) {
        source = 's3'
        const { bucket, keyPrefix } = FilePicker.parseS3URL(inFile);
        if (bucket) {
            browseOptions.bucket = bucket;
            inFile = keyPrefix;
        }
    }

    try {
        return (await FilePicker.browse(source, inFile, browseOptions)).files;
    } catch (err) {
        if(softFail) return false;
        throw throwError("Sequencer", `getFiles | ${err}`);
    }
}


/**
 * This function linearly interpolates between p1 and p2 based on a normalized value of t
 *
 * @param  {number}     p1     The start value
 * @param  {number}     p2     The end value
 * @param  {number}     t      The normalized percentage
 * @return {number}            Interpolated value
 */
export function lerp(p1, p2, t) {
    return p1 + (p2 - p1) * t;
}

/**
 * This function returns an float between a minimum and maximum value
 *
 * @param  {number}     min    The minimum value
 * @param  {number}     max    The maximum value
 * @return {number}            A random value between the range given
 */
export function random_float_between(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * This function returns an integer between a minimum and maximum value
 *
 * @param  {number}     min    The minimum value
 * @param  {number}     max    The maximum value
 * @return {int}               A random integer between the range given
 */
export function random_int_between(min, max) {
    return Math.floor(random_float_between(min, max));
}

/**
 * This function determines if the given parameter is a callable function
 *
 * @param  {function}   inFunc    The function object to be tested
 * @return {boolean}              A boolean whether the function is actually a function
 */
export function is_function(inFunc) {
    return inFunc && (
        {}.toString.call(inFunc) === '[object Function]'
        ||
        {}.toString.call(inFunc) === '[object AsyncFunction]'
    );
}

/**
 * This function returns a random element in the given array
 *
 * @param  {array}   inArray    An array
 * @param  {boolean} recurse    Whether to recurse if the randomly chosen element is also an array
 * @return {object}             A random element from the array
 */
export function random_array_element(inArray, recurse = false) {
    let choice = inArray[Math.floor(random_float_between(0, inArray.length))];
    if (recurse && Array.isArray(choice)) {
        return random_array_element(choice, true);
    }
    return choice;
}

/**
 * This function returns a random element in the given array
 *
 * @param  {object}   inObject   An object
 * @param  {boolean}  recurse    Whether to recurse if the randomly chosen element is also an object
 * @return {object}              A random element from the object
 */
export function random_object_element(inObject, recurse = false) {
    let keys = Object.keys(inObject).filter((k) => !k.startsWith("_"));
    let choice = inObject[random_array_element(keys)];
    if (typeof choice === "object" && recurse) {
        return random_object_element(choice, true);
    }
    return choice;
}


/**
 * Determines the dimensions of a given image file
 *
 * @param  {string}     inFile    The file to be loaded
 * @return {Promise}              A promise that will return the dimensions of the file
 */
export async function getDimensions(inFile) {
    return new Promise(async (resolve) => {
        let blob = await SequencerFileCache.loadFile(inFile);
        let video = document.createElement("video");
        video.crossOrigin = "anonymous";
        video.src = URL.createObjectURL(blob);
        video.onloadedmetadata = () => {
            let dimensions = {
                x: video.videoWidth,
                y: video.videoHeight,
            };
            video.pause();
            video.removeAttribute("src");
            resolve(dimensions);
        };
        video.onerror = () => {
            console.error(`File not found: ${inFile}`);
            resolve({ x: 0, y: 0 });
        };
    });
}

/**
 *  Gets a property in an object based on a path in dot-notated string
 *
 * @param   {object}         obj       The object to be queried
 * @param   {array|string}   path      The path in the object to the property in a dot-notated string
 * @returns {any}                      Property value, if found
 */
export function deepGet(obj, path) {
    if (!Array.isArray(path)) path = path.split(".");
    try {
        let i;
        for (i = 0; i < path.length - 1; i++) {
            obj = obj[path[i]];
        }
        return obj[path[i]];
    } catch (err) {}
}

/**
 *  Sets a property in an object based on a path in dot-notated string, example:
 *  let obj = { first: { second: { third: "value" } } }
 *  deepSet(obj, "newValue", "first.second.third")
 *  let obj = { first: { second: { third: "newValue" } } }
 *
 * @param  {object}         obj       The object to be modified
 * @param  {array|string}   path      The path in the object to the property in a dot-notated string
 * @param  {any}            value     The value to set
 */
export function deepSet(obj, path, value) {
    if (!Array.isArray(path)) path = path.split(".");
    try {
        let i;
        for (i = 0; i < path.length - 1; i++) {
            obj = obj[path[i]];
        }
        if (is_function(obj[path[i]])) {
            obj[path[i]](value);
        } else {
            obj[path[i]] = value;
        }
    } catch (err) {}
}

/**
 *  Flattens an object in a dot-notated format, like:
 *  { data: { entry: { thing: "stuff" } } }
 *  Becomes:
 *  [{ "data.entry.thing": "stuff" }]
 *
 * @param  {object}     obj       The object to be flattened
 * @return {object}               The flattened object
 */
export function flattenObject(obj) {
    let toReturn = [];
    for (let i in obj) {
        if (i.startsWith("_")) continue;
        if (!obj.hasOwnProperty(i)) continue;
        if (typeof obj[i] == "object") {
            let flatObject = flattenObject(obj[i]);
            for (let x in flatObject) {
                if (!flatObject.hasOwnProperty(x)) continue;
                toReturn[i + "." + x] = flatObject[x];
            }
        } else {
            toReturn[i] = obj[i];
        }
    }
    return toReturn;
}

export function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 *  Rotates a vector by a given number of degrees
 *
 * @param  {object}     vector    The vector to be rotated
 * @param  {number}     degrees   Number of degrees of which to rotate the vector
 * @return {object}               The rotated vector
 */
export function rotateVector(vector, degrees) {
    if ((vector.x === 0 && vector.y === 0) || degrees === 0) return vector;

    let distance = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
    let radians = degrees * (Math.PI / 180);

    let cos1 = vector.x / distance;
    let sin1 = vector.y / distance;
    let cos2 = Math.cos(radians);
    let sin2 = Math.sin(radians);
    let cos3 = cos1 * cos2 - sin1 * sin2;
    let sin3 = sin1 * cos2 + cos1 * sin2;

    vector.x = distance * cos3;
    vector.y = distance * sin3;

    return vector;
}

/**
 *  Scales and positions a vector based on the world transform of a context. This has been used to transform the space
 *  in which a filter exists in, as a PIXI filter exists in screen space position, rotation, and scale, and this could
 *  transform that filter to another context, such as a token on a canvas, so that the filter would react properly to
 *  the token moving, and the canvas scaling (zooming)
 *
 * @param  {object}     inVector    The vector to be transformed
 * @param  {object}     context     The context of which to transform the vector against
 * @return {object}                 The transformed vector
 */
export function transformVector(inVector, context = false) {
    let zoomLevel = canvas.background.worldTransform.a;
    let worldTransform = canvas.background.worldTransform;
    let localX = 0;
    let localY = 0;
    if (context) {
        localX = context.localTransform.tx;
        localY = context.localTransform.ty;
    }

    if (Array.isArray(inVector)) {
        return [
            (inVector[0] + localX) * zoomLevel + Math.min(worldTransform.tx, 0),
            (inVector[1] + localY) * zoomLevel + Math.min(worldTransform.ty, 0),
        ];
    }

    return {
        x: (inVector.x + localX) * zoomLevel + Math.min(worldTransform.tx, 0),
        y: (inVector.y + localY) * zoomLevel + Math.min(worldTransform.ty, 0),
    };
}

/**
 *  Gets all objects from a scene
 *
 * @param  {String}     inSceneId   The scene ID to get all valid objects from
 * @return {Array}                  Array containing all objects
 */
export function getAllObjects(inSceneId) {
    const scene = inSceneId
        ? game.scenes.get(inSceneId)
        : game.scenes.get(game.canvas.id);
    return [
        ...Array.from(scene.tokens).map(obj => obj?.object),
        ...Array.from(scene.templates).map(obj => obj?.object),
        ...Array.from(scene.tiles).map(obj => obj?.object),
        ...Array.from(scene.drawings).map(obj => obj?.object),
        ...canvas.templates.preview.children
    ].deepFlatten().filter(Boolean);
}

/**
 *  Gets an object by an unique identifier, such as an ID, name, tag, label
 *
 * @param  {String}     inObjectId  The object identifier to search for
 * @param  {String}     inSceneId   The scene ID to search within
 * @return {any}                    Object if found, else undefined
 */
export function getObjectFromScene(inObjectId, inSceneId) {
    return getAllObjects(inSceneId).find(obj => checkObjectByIdentifier(obj, inObjectId));
}

/**
 *  Get the unique identifier from an object
 *
 * @param  {Object}     inObject    The object to get the unique identifier from
 * @return {String}                 The identifier
 */
export function getObjectIdentifier(inObject){
    return inObject?.document?.uuid
        ?? inObject?.id
        ?? inObject?.document?.name
        ?? inObject?.name
        ?? (inObject?.tag !== "" ? inObject?.tag : undefined)
        ?? (inObject?.label !== "" ? inObject?.label : undefined);
}

function checkObjectByIdentifier(inObject, inIdentifier) {
    return getObjectIdentifier(inObject) === inIdentifier;
}

/**
 *  Turns an array containing multiples of the same string, objects, etc, and removes duplications, and returns a fresh array
 *
 * @param  {Array}     inArray     An array of multiple duplicate entries to be made unique
 * @return {Array}                 An array containing only unique objects
 */
export function makeArrayUnique(inArray){
    return Array.from(new Set(inArray));
}


export function debug(msg, args = ""){
    if(game.settings.get("sequencer", "debug")) console.log(`DEBUG | Sequencer | ${msg}`, args)
}

export function showWarning(inClassName, warning, notify = false) {
    inClassName = inClassName !== "Sequencer" ? "Sequencer | Module: " + inClassName : inClassName;
    warning = `${inClassName} | ${warning}`;
    if(notify) ui.notifications.warn(warning);
    console.warn(warning.replace("<br>", "\n"));
}

export function throwError(inClassName, error, notify = true) {
    inClassName = inClassName !== "Sequencer" ? "Sequencer | Module: " + inClassName : inClassName;
    error = `${inClassName} | ${error}`;
    if(notify) ui.notifications.error(error);
    return new Error(error.replace("<br>", "\n"));
}

export function isResponsibleGM() {
    if (!game.user.isGM) return false;
    const connectedGMs = game.users.filter(user => user.active && user.isGM);
    return !connectedGMs.some(other => other.data._id < game.user.data._id);
}

export class SequencerFile {
    constructor(inData, inTemplate, inDBPath) {
        inData = foundry.utils.duplicate(inData);
        this.template = inTemplate;
        this.dbPath = inDBPath;
        this.moduleName = inDBPath.split('.')[0];
        this.timeRange = inData?._timeRange;
        this.originalFile = inData?.file ?? inData;
        delete this.originalFile["_template"];
        delete this.originalFile["_timeRange"];
        this.file = foundry.utils.duplicate(this.originalFile);
        this.fileIndex = false;
        this.rangeFind =
            typeof this.file !== "string" && !Array.isArray(this.originalFile)
                ? Object.keys(this.originalFile).filter((key) =>
                      key.endsWith("ft")
                  ).length > 0
                : false;
    }

    async validate(){
        let isValid = true;
        const directories = {};
        const allFiles = this.getAllFiles();
        for(const file of allFiles) {
            let directory = file.split("/")
            directory.pop()
            directory = directory.join('/')
            if(directories[directory] === undefined){
                directories[directory] = await getFiles(directory);
            }
        }
        for(const file of allFiles) {
            let directory = file.split("/")
            directory.pop()
            directory = directory.join('/')

            if(directories[directory].indexOf(file) === -1) {
                console.warn(`"${this.dbPath}" has an incorrect file path, could not find file. Points to:\n${file}`)
                isValid = false;
            }
        }
        return isValid;
    }

    getAllFiles() {
        if (this.rangeFind) {
            return Object.values(this.file).deepFlatten();
        }
        return [this.file].deepFlatten();
    }

    getFile(inFt) {
        if (this.hasRangeFind(inFt)) {
            if (Array.isArray(this.file[inFt])) {
                return typeof this.fileIndex === "number"
                    ? this.file[inFt][this.fileIndex]
                    : random_array_element(this.file[inFt]);
            }
            return this.file[inFt];
        } else if (Array.isArray(this.file)) {
            return typeof this.fileIndex === "number"
                ? this.file[this.fileIndex]
                : random_array_element(this.file);
        }
        return this.file;
    }

    hasRangeFind(inFt){
        return inFt && this.rangeFind && this.file[inFt];
    }

    applyBaseFolder(baseFolder) {
        return this._applyFunctionToFiles(this._applyBaseFolder, baseFolder);
    }

    applyMustache(inMustache) {
        return this._applyFunctionToFiles(this._applyMustache, inMustache);
    }

    _applyFunctionToFiles(inFunction, inData) {
        if (this.rangeFind) {
            for (let key of Object.keys(this.originalFile)) {
                if (Array.isArray(this.originalFile[key])) {
                    this.file[key] = this.originalFile[key].map((file) =>
                        inFunction(inData, file)
                    );
                    continue;
                }
                this.file[key] = inFunction(inData, this.originalFile[key]);
            }
        } else {
            this.file = inFunction(inData, this.originalFile);
        }

        return this;
    }

    _applyBaseFolder(baseFolder, file) {
        return file.startsWith(baseFolder) ? file : baseFolder + file;
    }

    _applyMustache(inMustache, file) {
        let template = Handlebars.compile(file);
        return template(inMustache);
    }
}

export function groupBy(xs, key) {
    return xs.reduce(function (acc, obj) {
        let property = getProperty(obj, key);
        acc[property] = acc[property] || [];
        acc[property].push(obj);
        return acc;
    }, {});
}

export function sequenceProxyWrap(inSequence) {
    return new Proxy(inSequence, {
        get: function (target, prop) {
            if(target[prop] === undefined){
                if(Sequencer.SectionManager.externalSections[prop] === undefined) return Reflect.get(target, prop);
                target.sectionToCreate = Sequencer.SectionManager.externalSections[prop];
                return Reflect.get(target, "_createCustomSection");
            }
            return Reflect.get(target, prop);
        },
    });
}

export function sectionProxyWrap(inClass) {
    return new Proxy(inClass, {
        get: function (target, prop) {
            if (target[prop] === undefined) {
                let targetProperty = Reflect.get(target.sequence, prop);
                return is_function(targetProperty)
                    ? targetProperty.bind(target.sequence)
                    : targetProperty;
            }
            return Reflect.get(target, prop);
        },
    });
}

export function getObjectDimensions(inObj, half = false){
    const width =
        (inObj?.hitArea?.width
        ?? inObj?.w
        ?? inObj?.shape?.width
        ?? (inObj?.shape?.radius
        ? inObj?.shape?.radius*2
        : canvas.grid.size)) / (half ? 2 : 1);

    const height =
        (inObj?.hitArea?.height
        ?? inObj?.h
        ?? inObj?.shape?.height
        ?? (inObj?.shape?.radius
        ? inObj?.shape?.radius*2
        : canvas.grid.size)) / (half ? 2 : 1)

    return {
        width,
        height
    }
}

export function clamp(num, max, min = 0) {
    const _max = Math.max(min, max);
    const _min = Math.min(min, max);
    return Math.max(_min, Math.min(_max, num));
}

export function strToSearchRegexStr(str) {
    return str
        .trim()
        .replace(/[^A-Za-z0-9 .*_-]/g, "")
        .replace(/\*+/g, ".*?")
        .replace(/\s+/g, "|");
}