export default class BaseSection {

    constructor(inSequence) {
        this.sequence = inSequence;
        this._waitUntilFinished = false;
    }

    get shouldWaitUntilFinished(){
        return this._waitUntilFinished || this._waitAnyway
    }

    get _waitAnyway(){}

    async _prepareOffsetCache(){}

    // I know this is nasty - but it is needed due to Proxies not changing scope when calling Reflect.get
    play(...args){ return this.sequence.play(...args) }
    thenDo(...args){ return this.sequence.thenDo(...args) }
    macro(...args){ return this.sequence.macro(...args) }
    effect(...args){ return this.sequence.effect(...args) }
    sound(...args){ return this.sequence.sound(...args) }
    wait(...args){ return this.sequence.wait(...args) }
    animation(...args){ return this.sequence.animation(...args) }

}