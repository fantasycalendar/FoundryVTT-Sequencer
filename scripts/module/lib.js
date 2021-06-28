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
 * @return {object}             A random element from the array
 */
export function random_array_element(inArray){
    return inArray[Math.floor(random_float_between(0, inArray.length))];
}

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
            console.error('File not found');
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