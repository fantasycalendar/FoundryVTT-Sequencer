export default class BlurFilter extends PIXI.filters.BlurFilter {

    /**
     * Properties & default values:
     *     - strength [8]
     *     - blur [2]
     *     - blurX [2]
     *     - blurY [2]
     *     - quality [4]
     *     - resolution [PIXI.settings.FILTER_RESOLUTION]
     *     - kernelSize [5]
     */
    constructor(inData = {}) {
        super();

        inData = foundry.utils.mergeObject({
            strength: 8,
            quality: 4,
            resolution: PIXI.settings.FILTER_RESOLUTION,
            kernelSize: 5
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

