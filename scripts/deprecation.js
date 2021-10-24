export async function check(){
    await checkHyperspace();
}

async function checkHyperspace(){

    if(!hasHyperspaceAssets()) return;

    if(!game.modules.get("NRSAP")){

        if(game.settings.get("sequencer", "hyperspace-deprecation-warning")) return;

        const content = `
        <h2>Sequencer Hyperspace Assets Warning</h2>
        
        <p>Hi there! I can see that you're using the Sequencer Hyperspace assets in one or more your scenes.</p>
        <p>To reduce the size of the Sequencer module, I will be removing the assets in the future.</p>
        <p>But, a helpful Foundry user, Nachtrose, has created a module specifically for this content, which you can download <a href="https://foundryvtt.com/packages/nrsap">right here</a>. If you want to use that package, you'll have to also use the macros that come with it.</p>
        <p>If you install that package, this warning will go away, and I'll offer to update all of the file paths of those scenes and tiles to point to his module instead.</p>
        
        <p>Thanks,<br>Wasp</p>
        
        `;

        await new Promise(resolve => {
            new Dialog({
                title: "Sequencer Deprecation Warning",
                content: content,
                buttons: {
                    ok: { icon: '<i class="fas fa-check"></i>', label: 'Understood' },
                    dont_remind: {
                        icon: '<i class="fas fa-times"></i>',
                        label: "Don't remind me again",
                        callback: () => game.settings.set("sequencer", "hyperspace-deprecation-warning", true)
                    }
                },
                close: () => {
                    resolve()
                }
            }).render(true);
        });
        return;
    }

    const content = `
    <h2>Sequencer Hyperspace Assets Warning</h2>
    
    <p>Hi there! I can see that you're using the Sequencer Hyperspace assets in one or more your scenes.</p>
    <p>To reduce the size of the Sequencer module, I will be removing the assets in the future.</p>
    <p>I can see that you have <strong>Nachtrose's Sci-Fi (and modern) Animated Pack</strong> installed, would you like me to update your scenes and tiles to point to his assets instead?</p>
    <p>Don't worry, nothing will break or change visually, this will just future proof you once I remove the assets from Sequencer.</p> 
    <p>If you do decide to do it yourself, this warning will pop up again if you missed anything.</p>`;

    await new Promise(resolve => {
        new Dialog({
            title: "Sequencer Deprecation Warning",
            content: content,
            buttons: {
                ok: {
                    icon: '<i class="fas fa-check"></i>',
                    label: 'Yes, update my scenes and tiles',
                    callback: updateHyperspaceAssets
                },
                dont_remind: { icon: '<i class="fas fa-times"></i>', label: "No, I'll do it myself" }
            },
            close: () => {
                resolve()
            }
        }).render(true);
    });

}

function hasHyperspaceAssets(){
    for(const scene of game.scenes){
        if(scene.data.img && scene.data.img.includes('modules/sequencer/samples/Hyperspace/')) return true;
        for(const tile of scene.tiles){
            if(tile.data.img && tile.data.img.includes('modules/sequencer/samples/Hyperspace/')) return true;
        }
    }
    return false;
}

async function updateHyperspaceAssets(){

    for(const scene of game.scenes){
        let newSceneImage = false;
        if(scene.data.img && scene.data.img.includes('modules/sequencer/samples/Hyperspace/')){
            newSceneImage = scene.data.img;
            if(newSceneImage.endsWith("_background.jpg")){
                newSceneImage = newSceneImage.replace('modules/sequencer/samples/Hyperspace/', 'modules/NRSAP/library/travel/hyperspace/backgrounds/');
            }else{
                newSceneImage = newSceneImage.replace('modules/sequencer/samples/Hyperspace/', 'modules/NRSAP/library/travel/hyperspace/');
            }

            newSceneImage = newSceneImage.replace(/_/g, "-")

            console.log(`${scene.data.img} -> ${newSceneImage}`)

            await scene.update({
                "img": newSceneImage
            })
        }

        let updates = [];
        for(const tile of scene.tiles){
            if(tile.data.img && tile.data.img.includes('modules/sequencer/samples/Hyperspace/')){

                let newTileImage = tile.data.img;

                if(newTileImage.includes("Cockpit")){
                    newTileImage = newTileImage.replace('modules/sequencer/samples/Hyperspace/', 'modules/NRSAP/library/travel/hyperspace/foregrounds/')
                }else{
                    let re = new RegExp('modules/sequencer/samples/Hyperspace/(.*?)-hyperspace.webm');
                    newTileImage = newTileImage.replace(re, 'modules/NRSAP/library/travel/hyperspace/hyperspace-$1.webm')
                }

                newTileImage = newTileImage.replace(/_/g, "-")

                console.log(`${tile.data.img} -> ${newTileImage}`)

                updates.push({
                    "_id": tile.id,
                    "img": newTileImage
                });
            }
        }
        if(updates.length > 0) scene.updateEmbeddedDocuments("Tile", updates);
    }

    setTimeout(() => {
        window.location.reload();
    }, 100);
}