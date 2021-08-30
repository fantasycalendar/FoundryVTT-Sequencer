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
export function random_float_between(min, max){
    return Math.random() * (max - min) + min;
}

/**
 * This function returns an integer between a minimum and maximum value
 *
 * @param  {number}     min    The minimum value
 * @param  {number}     max    The maximum value
 * @return {int}               A random integer between the range given
 */
export function random_int_between(min, max){
    return Math.floor(random_float_between(min, max));
}

/**
 * This function determines if the given parameter is a callable function
 *
 * @param  {function}   inFunc    The function object to be tested
 * @return {boolean}              A boolean whether the function is actually a function
 */
export function is_function(inFunc){
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
export function random_array_element(inArray, recurse=false){
    let choice = inArray[Math.floor(random_float_between(0, inArray.length))];
    if(recurse && Array.isArray(choice)){
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
export function random_object_element(inObject, recurse=false){
    let keys = Object.keys(inObject).filter(k => !k.startsWith("_"));
    let choice = inObject[random_array_element(keys)];
    if(typeof choice === "object" && recurse){
        return random_object_element(choice, true)
    }
    return choice;
}

export async function fileExists(inFile){}

/**
 * Determines the dimensions of a given image file
 *
 * @param  {string}     inFile    The file to be loaded
 * @return {Promise}              A promise that will return the dimensions of the file
 */
export async function getDimensions(inFile){
    return new Promise(resolve => {
        let video = document.createElement("video");
        video.crossOrigin = "anonymous";
        video.src = inFile;
        video.onloadedmetadata = () => {
            let dimensions = {
                x: video.videoWidth,
                y: video.videoHeight
            };
            video.pause();
            video.removeAttribute('src');
            resolve(dimensions);
        }
        video.onerror = () => {
            console.error(`File not found: ${inFile}`);
            resolve({ x:0, y:0 });
        }
    })
}

/**
 *  Determines the duration of a given sound file
 *
 * @param  {string}     inFile    The sound file to be loaded
 * @return {Promise}              A promise that will return the dimensions of the file
 */
export async function getSoundDuration(inFile){
    return new Promise((resolve) => {
        let audio = new Audio();
        audio.onloadedmetadata = () => {
            resolve(audio.duration*1000); // ms
        }
        audio.onerror = () => {
            resolve(false);
        }
        audio.preload = "auto";
        audio.crossOrigin = "anonymous";
        audio.src = inFile;
    });
}

/**
 *  Gets a property in an object based on a path in dot-notated string
 *
 * @param   {object}         obj       The object to be queried
 * @param   {array|string}   path      The path in the object to the property in a dot-notated string
 * @returns {any}                      Property value, if found
 */
export function deepGet(obj, path){
    if(!Array.isArray(path)) path = path.split('.');
    try {
        let i;
        for (i = 0; i < path.length - 1; i++) {
            obj = obj[path[i]];
        }
        return obj[path[i]];
    }catch(err){
        throw new Error(`Could not find property "${path}"`)
    }
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
    if(!Array.isArray(path)) path = path.split('.');
    try{
        let i;
        for (i = 0; i < path.length - 1; i++) {
            obj = obj[path[i]];
        }
        obj[path[i]] = value;
    }catch(err){
        throw new Error(`Could not set property "${path}"`)
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
export function flattenObject(obj) {
    let toReturn = [];
    for (let i in obj) {
    	if (i.startsWith("_")) continue;
        if (!obj.hasOwnProperty(i)) continue;
        if ((typeof obj[i]) == 'object') {
            let flatObject = flattenObject(obj[i]);
            for (let x in flatObject) {
                if (!flatObject.hasOwnProperty(x)) continue;
                toReturn[i + '.' + x] = flatObject[x];
            }
        } else {
            toReturn[i] = obj[i];
        }
    }
    return toReturn;
}


export function wait(ms){
	return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 *  Rotates a vector by a given number of degrees
 *
 * @param  {object}     vector    The vector to be rotated
 * @param  {number}     degrees   Number of degrees of which to rotate the vector
 * @return {object}               The rotated vector
 */
export function rotateVector(vector, degrees){
    if((vector.x === 0 && vector.y === 0) || degrees === 0) return vector;

    let distance = Math.sqrt(vector.x*vector.x + vector.y*vector.y);
    let radians = degrees * (Math.PI / 180);

    let cos1 = vector.x / distance;
    let sin1 = vector.y / distance;
    let cos2 = Math.cos(radians);
    let sin2 = Math.sin(radians);
    let cos3 = cos1*cos2 - sin1*sin2;
    let sin3 = sin1*cos2 + cos1*sin2;

    vector.x = (distance * cos3);
    vector.y = (distance * sin3);

    return vector;
}

export function transformVector(inVector, context=false){

    let zoomLevel = canvas.background.worldTransform.a;
    let worldTransform = canvas.background.worldTransform;
    let localX = 0;
    let localY = 0;
    if(context) {
        localX = context.localTransform.tx;
        localY = context.localTransform.ty;
    }

    if(Array.isArray(inVector)) {
        return [
             (inVector[0] + localX) * zoomLevel + Math.min(worldTransform.tx, 0),
             (inVector[1] + localY) * zoomLevel + Math.min(worldTransform.ty, 0)
        ]
    }

    return {
        x: (inVector.x + localX) * zoomLevel + Math.min(worldTransform.tx, 0),
        y: (inVector.y + localY) * zoomLevel + Math.min(worldTransform.ty, 0)
    }
}

export class SequencerFile{

	constructor(inData, inTemplate){
		inData = foundry.utils.duplicate(inData);
		this.template = inTemplate;
		this.timeRange = inData?._timeRange;
		this.originalFile = inData?.file ?? inData;
		delete this.originalFile['_template'];
		delete this.originalFile['_timeRange'];
		this.file = foundry.utils.duplicate(this.originalFile);
		this.fileIndex = false;
		this.rangeFind = (typeof this.file !== "string" && !Array.isArray(this.originalFile)) ? Object.keys(this.originalFile).filter(key => key.endsWith('ft')).length > 0 : false;
	}

	getFile(inFt){
		if(inFt && this.rangeFind && this.file[inFt]) {
			if(Array.isArray(this.file[inFt])) {
				return typeof this.fileIndex === "number" ? this.file[inFt][this.fileIndex] : random_array_element(this.file[inFt]);
			}
			return this.file[inFt];
		}else if(Array.isArray(this.file)){
			return typeof this.fileIndex === "number" ? this.file[this.fileIndex] : random_array_element(this.file);
		}
		return this.file;
	}

	applyBaseFolder(baseFolder){
		return this._applyFunctionToFiles(this._applyBaseFolder, baseFolder);
	}

	applyMustache(inMustache){
		return this._applyFunctionToFiles(this._applyMustache, inMustache);
	}

	_applyFunctionToFiles(inFunction, inData){

		if(this.rangeFind){
			for(let key of Object.keys(this.originalFile)){
				if(Array.isArray(this.originalFile[key])){
					this.file[key] = this.originalFile[key].map(file => inFunction(inData, file))
					continue;
				}
				this.file[key] = inFunction(inData, this.originalFile[key])
			}
		}else{
			this.file = inFunction(inData, this.originalFile)
		}

		return this;

	}

	_applyBaseFolder(baseFolder, file){
		return file.startsWith(baseFolder) ? file : baseFolder + file;
	}

	_applyMustache(inMustache, file){
		let template = Handlebars.compile(file);
		return template(inMustache);
	}

}
