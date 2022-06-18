import CONSTANTS from "../constants.js";
import { easeFunctions } from "../canvas-effects/ease.js";

/**
 *  This function is a backwards compatible method for both 0.8.9 and 9.224 that returns a boolean whether
 *  you're on version 8 or 9
 *
 * @return {boolean}                    If the user is on version 9
 */
export function isVersion9() {
    return isNewerVersion((game?.version ?? game.data.version), "9.00");
}

/**
 *  This function linearly interpolates between p1 and p2 based on a normalized value of t
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
        if (softFail) return false;
        throw custom_error("Sequencer", `getFiles | ${err}`);
    }
}


/**
 *  This function interpolates between p1 and p2 based on a normalized value of t, determined by the ease provided (string or function)
 *
 * @param  {number}             p1      The start value
 * @param  {number}             p2      The end value
 * @param  {number}             t       The normalized percentage
 * @param  {string|function}    ease    Type of ease to interpolate
 * @return {number}                     Interpolated value
 */
export function interpolate(p1, p2, t, ease = "linear") {
    const easeFunction = is_function(ease) ? ease : easeFunctions[ease];
    return p1 + (p2 - p1) * easeFunction(t);
}

/**
 *  Returns a floating point number between a minimum and maximum value
 *
 * @param  {number}     min                     The minimum value
 * @param  {number}     max                     The maximum value
 * @param  {boolean|MersenneTwister} twister    The twister to generate the random results from
 * @return {number}                             A random value between the range given
 */
export function random_float_between(min, max, twister = false) {
    const random = twister ? twister.random() : Math.random();
    const _max = Math.max(max, min);
    const _min = Math.min(max, min);
    return random * (_max - _min) + _min;
}

/**
 *  Returns an integer between a minimum and maximum value
 *
 * @param  {number}     min                     The minimum value
 * @param  {number}     max                     The maximum value
 * @param  {boolean|MersenneTwister} twister    The twister to generate the random results from
 * @return {int}                                A random integer between the range given
 */
export function random_int_between(min, max, twister = false) {
    return Math.floor(random_float_between(min, max, twister));
}

/**
 *  Returns a shuffled copy of the original array.
 *
 * @param  {array}   inArray
 * @param  {boolean|MersenneTwister} twister    The twister to generate the random results from
 * @return {array}
 */
export function shuffle_array(inArray, twister = false) {
    let shuffled = foundry.utils.duplicate(inArray);
    const randomMethod = twister?.random ?? Math.random;
    for (let i = shuffled.length - 1; i > 0; i--) {
        let j = Math.floor(randomMethod() * (i + 1));
        let temp = shuffled[i];
        shuffled[i] = shuffled[j];
        shuffled[j] = temp;
    }
    return shuffled;
}

/**
 *  This function determines if the given parameter is a callable function
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
 *  Returns a random element in the given array
 *
 * @param  {array}   inArray                    An array
 * @param  {boolean} recurse                    Whether to recurse if the randomly chosen element is also an array
 * @param  {boolean|MersenneTwister} twister    The twister to generate the random results from
 * @return {object}                             A random element from the array
 */
export function random_array_element(inArray, { recurse = false, twister = false } = {}) {
    let choice = inArray[random_int_between(0, inArray.length, twister)];
    if (recurse && Array.isArray(choice)) {
        return random_array_element(choice, { recurse: true });
    }
    return choice;
}

/**
 *  Returns a random element in the given array
 *
 * @param  {object}   inObject                  An object
 * @param  {boolean}  recurse                   Whether to recurse if the randomly chosen element is also an object
 * @param  {boolean|MersenneTwister} twister    The twister to generate the random results from
 * @return {object}                             A random element from the object
 */
export function random_object_element(inObject, { recurse = false, twister = false } = {}) {
    let keys = Object.keys(inObject).filter((k) => !k.startsWith("_"));
    let choice = inObject[random_array_element(keys, { twister })];
    if (typeof choice === "object" && recurse) {
        return random_object_element(choice, { recurse: true });
    }
    return choice;
}

/**
 *  Tests a parameter whether it is a real number
 *
 * @param  {any}        inNumber    The parameter to test
 * @return {boolean}                Whether it is of type number, not infinite, and not NaN
 */
export function is_real_number(inNumber) {
    return !isNaN(inNumber)
        && typeof inNumber === "number"
        && isFinite(inNumber);
}

/**
 *  Gets a property in an object based on a path in dot-notated string
 *
 * @param   {object}         obj       The object to be queried
 * @param   {array|string}   path      The path in the object to the property in a dot-notated string
 * @returns {any}                      Property value, if found
 */
export function deep_get(obj, path) {
    if (!Array.isArray(path)) path = path.split(".");
    try {
        let i;
        for (i = 0; i < path.length - 1; i++) {
            obj = obj[path[i]];
        }
        return obj[path[i]];
    } catch (err) {
    }
}

/**
 *  Sets a property in an object based on a path in dot-notated string, example:
 *  let obj = { first: { second: { third: "value" } } }
 *  deep_set(obj, "newValue", "first.second.third")
 *  let obj = { first: { second: { third: "newValue" } } }
 *
 * @param  {object}         obj       The object to be modified
 * @param  {array|string}   path      The path in the object to the property in a dot-notated string
 * @param  {any}            value     The value to set
 */
export function deep_set(obj, path, value) {
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
    } catch (err) {
    }
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
export function flatten_object(obj) {
    let toReturn = [];
    for (let i in obj) {
        if (i.startsWith("_")) continue;
        if (!obj.hasOwnProperty(i)) continue;
        if (typeof obj[i] == "object") {
            let flatObject = flatten_object(obj[i]);
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

/**
 *  Wait for a duration.
 *
 * @param  {number}     ms      Milliseconds to wait
 * @return {Promise}            A promise that resolves after a given amount of milliseconds
 */
export function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 *  Clamps a value between two numbers
 *
 * @param  {number}     num     Number to clamp
 * @param  {number}     min     The minimum the number can be
 * @param  {number}     max     The maximum the number can be
 * @return {number}             The clamped number
 */
export function clamp(num, min, max) {
    const _max = Math.max(min, max);
    const _min = Math.min(min, max);
    return Math.max(_min, Math.min(_max, num));
}

/**
 * Checks whether a given string is a valid UUID or not
 *
 * @param {string} inId
 * @returns {boolean}
 */
export function is_UUID(inId) {
    return typeof inId === "string"
        && inId.startsWith("Scene")
        && (inId.match(/\./g) || []).length
        && !inId.endsWith(".");
}

/**
 *  Gets an object by an unique identifier, such as an ID, name, tag, label
 *
 * @param  {String}     inObjectId  The object identifier to search for
 * @param  {String}     inSceneId   The scene ID to search within
 * @return {any}                    Object if found, else undefined
 */
export function get_object_from_scene(inObjectId, inSceneId = game.user.viewedScene) {
    let tryUUID = is_UUID(inObjectId);
    if (tryUUID) {
        const obj = from_uuid_fast(inObjectId);
        if (obj) return obj;
        tryUUID = false;
    }
    return get_all_documents_from_scene(inSceneId).find(obj => {
        return get_object_identifier(obj, tryUUID) === inObjectId;
    });
}

/**
 *  Retrieves an object from the scene using its UUID, avoiding compendiums as they would have to be async'd
 *
 * @param uuid
 * @returns {null}
 */
export function from_uuid_fast(uuid) {
    let parts = uuid.split(".");
    let doc;

    const [docName, docId] = parts.slice(0, 2);
    parts = parts.slice(2);
    const collection = CONFIG[docName].collection.instance;
    doc = collection.get(docId);

    // Embedded Documents
    while (doc && (parts.length > 1)) {
        const [embeddedName, embeddedId] = parts.slice(0, 2);
        if(embeddedName === "SequencerEffect"){
            if(game.user.viewedScene !== docId){
                let effects = doc.getFlag(CONSTANTS.MODULE_NAME, CONSTANTS.FLAG_NAME);
                doc = new Map(effects).get(embeddedId)
            }else{
                doc = Sequencer.EffectManager.getEffects({ effect: docId })?.[0];
            }
        }else {
            doc = doc.getEmbeddedDocument(embeddedName, embeddedId);
        }
        parts = parts.slice(2);
    }
    return doc || null;
}

/**
 * Gets all documents from the given scene
 *
 * @param inSceneId [inSceneId]
 * @returns {Array<Document>}
 */
export function get_all_documents_from_scene(inSceneId){
    const scene = inSceneId
        ? game.scenes.get(inSceneId)
        : game.scenes.get(game.user?.viewedScene);
    return [
        ...canvas.templates.preview.children,
        ...Array.from(scene.tokens),
        ...Array.from(scene.lights),
        ...Array.from(scene.sounds),
        ...Array.from(scene.templates),
        ...Array.from(scene.tiles),
        ...Array.from(scene.walls),
        ...Array.from(scene.drawings),
    ].deepFlatten().filter(Boolean);
}

/**
 * Gets the document from an object, if it has one
 *
 * @param inObject
 * @returns {Document|{document}|*}
 */
export function validate_document(inObject) {
    const document = inObject?.document ?? inObject;
    return is_UUID(document?.uuid)
        ? document
        : inObject;
}

/**
 *  Get the unique identifier from an object
 *
 * @param  {Object}     inObject    The object to get the unique identifier from
 * @param  {Boolean}    tryUUID     The object to get the unique identifier from
 * @return {String}                 The identifier
 */
export function get_object_identifier(inObject, tryUUID = true) {
    const uuid = tryUUID && is_UUID(inObject?.uuid) ? inObject?.uuid : undefined;
    return uuid
        ?? inObject?.id
        ?? inObject?.document?.name
        ?? inObject?.name
        ?? (inObject?.tag !== "" ? inObject?.tag : undefined)
        ?? (inObject?.label !== "" ? inObject?.label : undefined);
}

/**
 *  Turns an array containing multiples of the same string, objects, etc, and removes duplications, and returns a fresh array
 *
 * @param  {Array}     inArray     An array of multiple duplicate collections to be made unique
 * @return {Array}                 An array containing only unique objects
 */
export function make_array_unique(inArray) {
    return Array.from(new Set(inArray));
}

export function debug(msg, args = "") {
    if (game.settings.get(CONSTANTS.MODULE_NAME, "debug")) console.log(`DEBUG | Sequencer | ${msg}`, args)
}

export function debug_error(msg, args) {
    if (game.settings.get(CONSTANTS.MODULE_NAME, "debug")) console.error(`DEBUG | Sequencer | ${msg}`, args)
}

export function custom_warning(inClassName, warning, notify = false) {
    inClassName = inClassName !== "Sequencer" ? "Sequencer | Module: " + inClassName : inClassName;
    warning = `${inClassName} | ${warning}`;
    if (notify) ui.notifications.warn(warning);
    console.warn(warning.replace("<br>", "\n"));
}

export function custom_error(inClassName, error, notify = true) {
    inClassName = inClassName !== "Sequencer" ? "Sequencer | Module: " + inClassName : inClassName;
    error = `${inClassName} | ${error}`;
    if (notify) ui.notifications.error(error);
    return new Error(error.replace("<br>", "\n"));
}

export function user_can_do(inSetting) {
    return game.user.role > game.settings.get(CONSTANTS.MODULE_NAME, inSetting);
}

export function group_by(xs, key) {
    return xs.reduce(function (acc, obj) {
        let property = getProperty(obj, key);
        acc[property] = acc[property] || [];
        acc[property].push(obj);
        return acc;
    }, {});
}

export function sequence_proxy_wrap(inSequence) {
    return new Proxy(inSequence, {
        get: function (target, prop) {
            if (target[prop] === undefined) {
                if (Sequencer.SectionManager.externalSections[prop] === undefined) return Reflect.get(target, prop);
                target.sectionToCreate = Sequencer.SectionManager.externalSections[prop];
                return Reflect.get(target, "_createCustomSection");
            }
            return Reflect.get(target, prop);
        },
    });
}

export function section_proxy_wrap(inClass) {
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

export function str_to_search_regex_str(str) {
    return str
        .trim()
        .replace(/[^A-Za-z0-9 .*_-]/g, "")
        .replace(/\*+/g, ".*?");
}

export function safe_str(str){
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function scroll_to_element(scrollElement, scrollToElement, duration = 500) {
    if (!duration) {
        scrollElement.scrollTop(scrollElement.scrollTop() - scrollElement.offset().top + scrollToElement.offset().top);
        return;
    }

    scrollElement.animate({
        scrollTop: scrollElement.scrollTop() - scrollElement.offset().top + scrollToElement.offset().top
    }, duration);

    return wait(duration);
}

export async function highlight_element(element, { duration = false, color = "#FF0000", size = "3px" } = {}) {
    element.prop("style", `-webkit-box-shadow: inset 0px 0px ${size} ${size} ${color}; box-shadow: inset 0px 0px ${size} ${size} ${color};`);
    if (!duration) return;
    await wait(duration);
    element.prop("style", "");
}

export function get_hash(input) {
    let hash = 0
    const len = input.length;
    for (let i = 0; i < len; i++) {
        hash = ((hash << 5) - hash) + input.charCodeAt(i);
        hash |= 0; // to 32bit integer
    }
    return hash;
}