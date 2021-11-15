const loadingBar = {

    debug: false,

    loadingParent: false,
    loadingBar: false,
    loadingLabel: false,

    total: 0,
    current: 0,
    lastPerc: 0,

    init(context, total) {

        this.context = context;
        this.total = total;
        this.current = 0;
        this.lastPerc = 0;

    },

    incrementProgress() {

        this.current += 1;
        let perc = this.current / this.total;
        let newPerc = Math.round(perc * 100);

        if (newPerc !== this.lastPerc) {
            lib.debug(`${newPerc}% loaded...`)
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