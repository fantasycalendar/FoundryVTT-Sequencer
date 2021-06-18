export class EffectsCanvasAnimation extends CanvasAnimation {

    static async animateSmooth(attributes, { context, name = null, duration = 1000, ontick, ease } = {}) {
        // Prepare attributes
        attributes = attributes.map(a => {
            a.delta = a.to - a.parent[a.attribute];
            a.done = 0;
            a.remaining = duration;
            return a;
        }).filter(a => a.delta !== 0);

        // Register the request function and context
        context = context || canvas.stage;

        // Dispatch the animation request and return as a Promise
        return this._animatePromise(this._animateFrameSmooth(ease), context, name, attributes, duration, ontick);
    }

    static _animateFrameSmooth(ease) {
        return function (deltaTime, resolve, reject, attributes, duration, ontick) {
            let complete = attributes.length === 0;
            let dt = (duration * PIXI.settings.TARGET_FPMS) / deltaTime;

            // Update each attribute
            try {
                for (let a of attributes) {
                    let da = a.delta / dt;
                    a.d = da;
                    if (a.remaining < (Math.abs(da) * 1.25)) {
                        a.parent[a.attribute] = a.to;
                        a.done = a.delta;
                        a.remaining = 0;
                        complete = true;
                    } else {
                        let progress = a.done / a.delta;
                        let start = a.to - a.delta;
                        a.done += da;
                        a.remaining = Math.abs(a.delta) - Math.abs(a.done);
                        a.parent[a.attribute] = ease(progress) * a.delta + start;
                    }
                }
                if (ontick) ontick(dt, attributes);
            }
            catch (err) {}

            // Resolve the original promise once the animation is complete
            if (complete) resolve();
        }
    }
}