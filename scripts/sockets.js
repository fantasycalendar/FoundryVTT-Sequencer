import CanvasEffect from "./module/canvas-effects/canvas-effect.js";

export function registerSocket(){

    game.socket.on("module.sequencer", (data) => {
        playEffect(data);
    });

    console.log("Sequencer | Registered socket");

}

export async function playEffect(data){

    let layers = [
        canvas.background,
        canvas.sequencerEffectsBelowTokens,
        canvas.sequencerEffectsAboveTokens
    ];

    let layer = layers[data.layer ?? 2];

    let container = layer.children.find(child => child?.parentName === "sequencer");

    if(!container) {
        if(layer === canvas.background){
            layer.children.filter(child => child.sortableChildren).map(child => child.zIndex = 1);
            layer.sortChildren();
        }
        container = new PIXI.Container();
        container.sortableChildren = true;
        container.parentName = "sequencer";
        container.zIndex = 0.5;
        layer.addChild(container);
    }

    return new CanvasEffect(container, data).play();

}