export default class ColorMatrixFilter extends PIXI.filters.ColorMatrixFilter{

	constructor(inData){
		super();

		this.isValid = true;
		for(let [key, value] of Object.entries(inData)) {
			if(!Array.isArray(value)) value = [value, true];
			try {
				this[key](...value);
			} catch (err) {
				let warning = `Sequencer | ${this.constructor.name} | Could not set property ${key}`;
				ui.notifications.warn(warning);
				console.warn(warning)
				this.isValid = false;
			}
		}
	}

}