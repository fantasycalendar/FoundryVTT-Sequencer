export default class ColorMatrixFilter extends PIXI.filters.ColorMatrixFilter {

    /**
     * Properties & default values:
     *     - hue [false]
     *     - brightness [1]
     *     - contrast [1]
     *     - saturate [1]
     */
    constructor(inData) {
        super();
        this.isValid = true;
        this.values = {};
        for (let [key, value] of Object.entries(inData)) {
            this.setValue(key, value);
            if(!this.isValid) break;
        }
    }

    setValue(key, value){
        try {
            this.values[key] = value;
            this[key](value, true);
        } catch (err) {
            let warning = `Sequencer | ${this.constructor.name} | Could not set property ${key}`;
            ui.notifications.warn(warning);
            console.warn(warning)
        }
    }
}