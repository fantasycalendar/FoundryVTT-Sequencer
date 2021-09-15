export default class NoiseFilter extends PIXI.filters.NoiseFilter {

    /**
     * Properties & default values:
     *     - noise [0.5]
     *     - seed [Math.random()]
     */
    constructor(inData = {}) {
        super();

        inData = foundry.utils.mergeObject({
            noise: 0.5,
            seed: Math.random()
        }, inData)

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