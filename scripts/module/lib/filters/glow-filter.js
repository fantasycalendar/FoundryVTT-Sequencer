export default class GlowFilter extends PIXI.filters.GlowFilter {

    /**
     * Properties & default values:
     *     - distance [10]
     *     - outerStrength [4]
     *     - innerStrength [0]
     *     - color [0xffffff]
     *     - quality [0.1]
     *     - knockout [false]
     */
    constructor(inData = {}) {

        inData = foundry.utils.mergeObject({
            distance: 10,
            outerStrength: 4,
            innerStrength: 0,
            color: 0xffffff,
            quality: 0.1,
            knockout: false
        }, inData)

        super(inData);

        this.isValid = true;

    }

}