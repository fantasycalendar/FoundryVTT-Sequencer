async function wait(ms) { return new Promise(resolve => { setTimeout(resolve, ms); }); }

class Sequence{

    constructor() {
        this.sections = [];
    }

    then(func, async = false){
        let section = new Section(func, async);
        this.sections.push(section);
        return this;
    }

    effect(){
        let effect = new Effect(this);
        this.sections.push(effect);
        return effect;
    }

    wait(ms = 0){

        this.sections.push(new Section(() => {
            return new Promise((resolve, reject) => { setTimeout(resolve, ms) });
        }));

        return this;

    }

    async play(){

        for(let section of this.sections){
            await wait(1);
            await section.run();
        }

    }

}

class Section{

    constructor(func, async) {
        this.func = func;
        this._async = async ?? true;
    }

    async run(){
        if(this._async) {
            await this.func();
        }else{
            this.func();
        }
        return this;
    }

}

class Effect {

    constructor(sequence) {
        this.sequence = sequence;
        this._async = false;
        this._delay = 0;
        this._file = "";
        this._from = undefined;
        this._to = undefined;
        this._moves = false;
        this._scale = undefined;
        this._anchor = undefined;
    }

    _sanitizeData() {

        let data = {
            file: this._file,
            position: {
                x: 0,
                y: 0,
            },
            anchor: {
                x: this._anchor?.x ?? 1.0,
                y: this._anchor?.y ?? 1.0
            },
            scale: {
                x: this._scale?.x ?? 1.0,
                y: this._scale?.y ?? 1.0
            },
            angle: 0,
            speed: 0,
        };

        if (this._from) {
            if (this._from instanceof Token) {
                data.position = {
                    x: this._from.center.x,
                    y: this._from.center.y
                }
            } else {
                data.position = {
                    x: this._from?.x ?? 0,
                    y: this._from?.y ?? 0,
                }
            }
            if (!this._anchor) {
                data.anchor = {
                    x: 0.5,
                    y: 0.5
                }
            }
        }

        if (this._to) {

            if (this._to instanceof Token) {
                this._to = {
                    x: this._to.center.x,
                    y: this._to.center.y
                }
            } else {
                this._to = {
                    x: this._to?.x ?? 0,
                    y: this._to?.y ?? 0,
                }
            }

            let ray = new Ray(data.position, this._to);

            data.rotation = ray.angle;

            if (this._moves) {
                data.distance = ray.distance;
            } else {
                data.width = ray.distance;
            }

            if (!this._anchor) {
                data.anchor = {
                    x: 0.0,
                    y: 0.5,
                };
            }

        }

        return data;

    }

    async run() {
        let data = this._sanitizeData();
        let delay = this._delay;
        let async = this._async;
        let self = this;
        return new Promise((resolve, reject) => {
            setTimeout(async function () {
                game.socket.emit("module.fxmaster", data);
                if (async) {
                    await canvas.fxmaster.playVideo(data);
                } else {
                    canvas.fxmaster.playVideo(data);
                }
                resolve(self);
            }, delay);
        });
    }

    file(inFile) {
        this._file = inFile;
        return this;
    }

    delay(ms) {
        this._delay = ms;
        return this;
    }

    async(inBool) {
        this._async = inBool;
        return this;
    }

    atLocation(inLocation) {

        if (inLocation instanceof Token) {
            this._from = inLocation;
        } else {
            this._from = {
                x: inLocation.x ?? 0,
                y: inLocation.y ?? 0
            }
        }

        return this;

    }

    aimTowards(inLocation) {

        if (inLocation instanceof Token) {
            this._to = inLocation;
        } else {
            this._to = {
                x: inLocation.x ?? 0,
                y: inLocation.y ?? 0
            }
        }

        return this;

    }

    scale(inScale) {

        if (typeof inScale === "number") {
            inScale = {
                x: inScale,
                y: inScale
            }
        }

        this._scale = inScale;
        return this;

    }

    center() {
        this._anchor = {x: 0.5, y: 0.5};
        return this;
    }

    done() {
        return this.sequence;
    }

}