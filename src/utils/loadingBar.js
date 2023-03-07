import { debug } from "../lib/lib.js";

class loading_bar {

  constructor() {
    this.total = 0;
    this.current = 0;
    this.lastPct = 0;
  }

  init(context, total) {

    this.context = context;
    this.total = total;
    this.current = 0;
    this.lastPct = 0;
    SceneNavigation.displayProgressBar({ label: this.context, pct: 1 })
  }

  incrementProgress() {
    this.current += 1;
    const pct = Math.round((this.current / this.total) * 100);
    if (pct !== this.lastPct) {
      debug(`${pct}% loaded...`)
      SceneNavigation.displayProgressBar({ label: this.context, pct: pct })
    }
    this.lastPct = pct;
  }

}

const LoadingBar = new loading_bar();

export default LoadingBar;
