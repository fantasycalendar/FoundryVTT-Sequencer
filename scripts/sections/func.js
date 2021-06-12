import * as lib from "../lib.js";
import Section from "./base.js";

export default class FunctionSection extends Section {

    constructor(inSequence, inFunc, inAsync) {
        super(inSequence, inAsync)
        if(!lib.is_function(inFunc)) throw new Error("The given function needs to be an actual function.");
        this._func = inFunc;
    }

    async run() {
        await this._func();
    }

    async execute() {
        await this.run();
    }

}