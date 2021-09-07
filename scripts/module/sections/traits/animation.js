export default {

	_animations: false,

	animate(target, inPropertyName, inData={}){
		if(!this._animations) this._animations = [];
		let parent = target?.uuid ?? target;

		if(typeof inPropertyName !== "string") this.sequence._throwError(this, "filter", `inPropertyName must be of type string`);
		if(!target?.uuid && typeof parent !== "string") this.sequence._throwError(this, "filter", `target must be of type string or UUID`);

		this._animations.push({
			name: inPropertyName,
			isUUID: target?.uuid ?? false,
			parent: parent,
			from: inData?.from ?? 0,
			to: inData?.to ?? 0,
			duration: inData?.duration ?? 0,
			ease: inData?.ease ?? "linear",
			delay: inData?.delay ?? 0
		});

		return this;

	},

	animateLoop(inPropertyName, target, inData={}) {


	}

}