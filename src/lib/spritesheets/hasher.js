/**
 * 
 * @param {Uint8Array} input 
 * @returns {string} the hash
 */
export function getUint8ArrayHash(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input[i];
    hash |= 0; // to 32bit integer
  }
  return (hash >>> 0).toString(36).padStart(7, '0');;
}