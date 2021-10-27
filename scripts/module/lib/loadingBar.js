const loadingBar = {

    debug: false,

    loadingParent: false,
    loadingBar: false,
    loadingLabel: false,

    total: 0,
    current: 0,
    lastPerc: 0,

    init(context, total, debug) {

        this.context = context;
        this.total = total;
        this.current = 0;
        this.lastPerc = 0;
        this.debug = debug;

    },

    incrementProgress() {

        this.current += 1;
        let perc = this.current / this.total;
        let newPerc = Math.round(perc * 100);

        if (newPerc !== this.lastPerc) {
            if (this.debug) console.log(`${newPerc}% loaded...`)
            this.setPercentage(newPerc)
        }

        this.lastPerc = newPerc;

    },

    setPercentage(perc) {
        SceneNavigation._onLoadProgress(this.context, perc);
    },

    hide() {
        this.setPercentage(100);
        this.total = 0;
        this.current = 0;
        this.lastPerc = 0;
    }

}

export default loadingBar;