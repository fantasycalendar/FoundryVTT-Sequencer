export default class BlurFilterPass extends PIXI.filters.BlurFilterPass {

    constructor(inData = {}) {

        inData = foundry.utils.mergeObject({
            horizontal: true
        }, inData)

        super(inData.horizontal);

        this.isValid = true;
        for (let [key, value] of Object.entries(inData)) {
            try {
                this[key] = value;
            } catch (err) {
                let warning = `Sequencer | ${this.constructor.name} | Could not set property ${key}`;
                ui.notifications.warn(warning);
                console.warn(warning)
                this.isValid = false;
            }
        }
    }
}