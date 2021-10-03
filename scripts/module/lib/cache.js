/**
 * @template T
 * @template {keyof T} K
 * @typedef {T[K] extends Function ? K: never} FunctionKey
 */

/**
 * @template T
 * @template {keyof T} K
 * @typedef {T[K] extends Function ? never : K} PropertyKey
 */

/**
 * @template T
 * @typedef {keyof { [K in keyof T as FunctionKey<T,K>]: T[K] }} Methods
 */

/**
 * @template T
 * @typedef {keyof { [K in keyof T as PropertyKey<T,K>]: T[K] }} Properties
 */

const _cache = new WeakMap();

/**
 * @template T obj
 * @param {T} obj
 * @param {Methods<T>} method
 * @param {Properties<T>[]} dependentProperties
 */
export function cache(obj, method, dependentProperties) {
    if (typeof obj[method] !== "function")
        throw new Error("Method must be a function");
    let dirty = true;
    let cached;

    const old = obj[method].bind(obj);

    obj[method] = function (...args) {
        if (dirty) {
            cached = old(...args);
            dirty = false;
        }
        return cached;
    };

    for (const key of dependentProperties) {
        const descriptor = Object.getOwnPropertyDescriptor(obj, key);
        const newDescriptor = {};

        if (!descriptor || "value" in descriptor) {
            // ensure we have a property map
            const map = _cache.get(obj) ?? new Map();
            map.set(key, descriptor ? descriptor.value : undefined);
            _cache.set(obj, map);

            newDescriptor.get = () => {
                return _cache.get(obj).get(key);
            };
            newDescriptor.set = (v) => {
                dirty = true;
                _cache.get(obj).set(key, v);
            };
        } else {
            if (descriptor.get) {
                newDescriptor.get = () => {
                    return descriptor.get.call(obj);
                };
            }
            if (descriptor.set) {
                newDescriptor.set = (v) => {
                    dirty = true;
                    return descriptor.set.call(this, v);
                };
            }
        }
        Object.defineProperty(obj, key, newDescriptor);
    }
}
