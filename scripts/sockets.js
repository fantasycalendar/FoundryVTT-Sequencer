export function registerSocket(){

    game.socket.on("module.sequencer", (data) => {
        playEffect(data);
    });

    console.log("Sequencer | Registered socket");

}

export async function playEffect(data){

    let layers = [
        canvas.sequencerEffectsBelowTiles,
        canvas.sequencerEffectsBelowTokens,
        canvas.sequencerEffectsAboveTokens
    ];

    let layer = layers[data.layer ?? 2];

    return await layer.playEffect(data);

}