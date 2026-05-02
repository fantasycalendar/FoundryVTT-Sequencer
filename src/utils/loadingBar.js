import { debug } from "../lib/lib.js";

class loading_bar {
  constructor() {
    this.total = 0;
    this.current = 0;
    this.lastPct = 0;
    this.bar = null;
  }

  init(context, total) {
    this.bar?.remove();
    this.context = context;
    this.total = total;
    this.current = 0;
    this.lastPct = 0;
    this.bar = ui.notifications.info(this.context, { progress: true });
    this.bar.update({ pct: 0.01 });
  }

  incrementProgress() {
    this.current += 1;
    const pct = Math.round((this.current / this.total) * 100);
    if (pct !== this.lastPct) {
      debug(`${pct}% loaded...`);
      this.bar?.update({ message: this.context, pct: pct / 100 });
    }
    this.lastPct = pct;
    if (this.current >= this.total) {
      this.bar?.remove();
      this.bar = null;
    }
  }
}

const LoadingBar = new loading_bar();

export default LoadingBar;
