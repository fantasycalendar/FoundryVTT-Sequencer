export default {

	_animations: false,

	animateProperty(target, inPropertyName, inData={}){
	    if(!this._animations) this._animations = [];

		if(typeof inPropertyName !== "string") throw this.sequence._throwError(this, "animateProperty", `inPropertyName must be of type string`);
		if(typeof target !== "string") throw this.sequence._throwError(this, "animateProperty", `target must be of type string`);
        if(typeof inData.from !== "number") throw this.sequence._throwError(this, "animateProperty", `inData.from must be of type number`);
        if(typeof inData.to !== "number") throw this.sequence._throwError(this, "animateProperty", `inData.to must be of type number`);
        if(typeof inData.duration !== "number") throw this.sequence._throwError(this, "animateProperty", `inData.duration must be of type number`);
        if(inData?.delay && typeof inData.delay !== "number") throw this.sequence._throwError(this, "animateProperty", `inData.delay must be of type number`);
        if(inData?.offset && typeof inData.offset !== "number") throw this.sequence._throwError(this, "animateProperty", `inData.offset must be of type number`);
        if(inData?.ease && typeof inData.ease !== "number") throw this.sequence._throwError(this, "animateProperty", `inData.ease must be of type string`);

		this._animations.push({
            target: target,
            propertyName: inPropertyName,
			from: inData?.from,
			to: inData?.to,
            duration: inData?.duration ?? 0,
            offset: inData?.offset ?? 0,
            delay: inData?.delay ?? 0,
            ease: inData?.ease ?? "linear",
            looping: false,
		});

		return this;

	},

    loopProperty(target, inPropertyName, inData={}) {
        if(!this._animations) this._animations = [];

        if(typeof inPropertyName !== "string") throw this.sequence._throwError(this, "animateLoop", `inPropertyName must be of type string`);
        if(typeof target !== "string") throw this.sequence._throwError(this, "animateLoop", `target must be of type string`);

        if(!inData?.values){
            if(!inData?.from === undefined || !inData?.to === undefined) throw this.sequence._throwError(this, "animateLoop", `if inData.values is not set, you must provide inData.from and inData.to`);
            if(typeof inData.from !== "number") throw this.sequence._throwError(this, "animateLoop", `inData.from must be of type number`);
            if(typeof inData.to !== "number") throw this.sequence._throwError(this, "animateLoop", `inData.to must be of type number`);
            inData.values = [inData?.from, inData?.to];
            delete inData.from;
            delete inData.to;
        }else{
            if(!Array.isArray(inData.values)) throw this.sequence._throwError(this, "animateLoop", `inData.values must be of type array`);
            inData.values.forEach(value => {
                if(typeof value !== "number") throw this.sequence._throwError(this, "animateLoop", `values in inData.keys must be of type number`);
            });
        }

        if(typeof inData.duration !== "number") throw this.sequence._throwError(this, "animateLoop", `inData.duration must be of type number`);

        if(inData?.delay !== undefined && typeof inData.delay !== "number") throw this.sequence._throwError(this, "animateLoop", `inData.delay must be of type number`);
        if(inData?.offset !== undefined && typeof inData.offset !== "number") throw this.sequence._throwError(this, "animateLoop", `inData.offset must be of type number`);
        if(inData?.ease !== undefined && typeof inData.ease !== "string") throw this.sequence._throwError(this, "animateLoop", `inData.ease must be of type string`);
        if(inData?.loops !== undefined && typeof inData.loops !== "number") throw this.sequence._throwError(this, "animateLoop", `inData.loops must be of type number`);
        if(inData?.pingPong !== undefined && typeof inData.pingPong !== "boolean") throw this.sequence._throwError(this, "animateLoop", `inData.loops must be of type boolean`);

        this._animations.push({
            target: target,
            propertyName: inPropertyName,
            values: inData?.values,
            duration: inData?.duration ?? 0,
            delay: inData?.delay ?? 0,
            offset: inData?.offset ?? 0,
            ease: inData?.ease ?? "linear",
            looping: true,
            loops: inData?.loops,
            indefinite: inData?.loops === undefined,
            pingPong: inData?.pingPong ?? false
        });

        return this;

	}

}