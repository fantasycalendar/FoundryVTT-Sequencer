import { debug, isVersion9 } from "./lib.js";

class loading_bar {

    constructor() {
        this.total = 0;
        this.current = 0;
        this.lastPct = 0;
        this.setPercentage = false;
    }

    init(context, total){
        this.setPercentage = this.setPercentage || (isVersion9()
            ? (pct) => { SceneNavigation.displayProgressBar({ label: this.context, pct: pct }); }
            : (pct) => { SceneNavigation._onLoadProgress(this.context, pct); });

        this.context = context;
        this.total = total;
        this.current = 0;
        this.lastPct = 0;
        this.setPercentage(1)
    }

    incrementProgress() {
        this.current += 1;
        const pct = Math.round((this.current / this.total) * 100);
        if (pct !== this.lastPct) {
            debug(`${pct}% loaded...`)
            this.setPercentage(pct)
        }
        this.lastPct = pct;
    }

}

const LoadingBar = new loading_bar();

export default LoadingBar;