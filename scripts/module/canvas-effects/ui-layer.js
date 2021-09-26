export default class SequencerUILayer{

    constructor() {

        this.canvas = document.createElement("canvas");
        this.canvas.id = "sequencerUILayer"

        this.canvas.style.cssText = `
            position:absolute;
            touch-action: none;
            pointer-events: none;
            width:100%;
            height:100%;
            z-index:0.5;
            padding: 0;
            margin: 0;
        `;

        document.body.appendChild(this.canvas);

        this.app = new PIXI.Application({
            width: window.innerWidth,
            height: window.innerHeight,
            view: this.canvas,
            antialias: true,
            backgroundAlpha: 0.0,
            sharedTicker: true
        });

        this.app.resizeTo = window;

        this.container = new PIXI.Container();

        this.app.stage.addChild(this.container);

    }

}