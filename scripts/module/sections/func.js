import * as lib from "../lib.js";
import BaseSection from "./base.js";

export default class FunctionSection extends BaseSection {

    constructor(inSequence, inFunc) {
        super(inSequence)
        if(!lib.is_function(inFunc)) this._throwError("create", "The given function needs to be an actual function");
        this._func = inFunc;
        this._waitUntilFinished = inFunc.constructor.name === 'AsyncFunction';
    }

    async _run() {
        this.sequence._log("Running function");
        await this._func();
    }

    async _execute() {
        await this._run();
    }

}