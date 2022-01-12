import * as lib from "../lib/lib.js";
import Section from "./section.js";

export default class FunctionSection extends Section {

    constructor(inSequence, inFunc) {
        super(inSequence)
        if (!lib.is_function(inFunc)) this._customError("create", "The given function needs to be an actual function");
        this._func = inFunc;
        this._waitUntilFinished = inFunc.constructor.name === 'AsyncFunction';
    }

    /**
     * @returns {Promise<void>}
     */
    async run() {
        lib.debug("Running function");
        await this._func();
    }

    /**
     * @returns {Promise}
     * @private
     */
    async _execute() {
        await this.run();
    }

}