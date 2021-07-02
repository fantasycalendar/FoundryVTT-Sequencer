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
