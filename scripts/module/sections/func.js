import * as lib from "../lib.js";
import Section from "./base.js";

export default class FunctionSection extends Section {

    constructor(inSequence, inFunc) {
        super(inSequence)
        if(!lib.is_function(inFunc)) this.throwError("create", "The given function needs to be an actual function");
        this._func = inFunc;
        this._waitUntilFinished = inFunc.constructor.name === 'AsyncFunction';
    }

    async run() {
        await this._func();
    }

    async execute() {
        await this.run();
    }

}