/**
 * This function returns a value that has been lineraly interpolated between p0 and p1
 *
 * @param  {float}  p0      The first float
 * @param  {float}  p1      The second float
 * @param  {float}  t       A normalized value between 0.0 and 1.0, 0.0 returning p0 and 1.0 returning p1
 * @return {float}          The interpolated value
 */
function lerp(p0, p1, t){
    return p0 + t*(p1 - p0);
}

/**
 * This function gets the middle value of the two given value
 *
 * @param  {float}    p0    The first value
 * @param  {float}    p1    The second value
 * @return {float}          The middle value
 */
function mid(p0, p1){
    return (p0+p1)/2;
}

/**
 * This function normalizes a value (v) between min and max
 *
 * @param  {float}  v       The value to be normalized
 * @param  {float}  min     The minimum value
 * @param  {float}  max     The maximum value
 * @return {float}          The normalized value
 */
function norm(v, min, max)
{
    return (v - min) / (max - min);
}

/**
 * This function returns an integer between minimum and maximum, based on the index you give it
 *
 * @param  {int}     idx    The index in the pseudo-random sequence
 * @param  {int}     min    The minimum value
 * @param  {int}     max    The maximmum value
 * @return {int}            A pseudo-random value
 */
function random_float_between(min, max){
    return Math.random() * (max - min) + min;
}

/**
 * This function returns an integer between minimum and maximum, based on the index you give it
 *
 * @param  {int}     idx    The index in the pseudo-random sequence
 * @param  {int}     min    The minimum value
 * @param  {int}     max    The maximmum value
 * @return {int}            A pseudo-random value
 */
function random_int_between(min, max){
    return Math.floor(random_float_between(min, max));
}