// Requires the Jack Kerouac's Animated Spell Effects: Cartoon module
// Requires Advanced Macros
// Requires MidiQOL with Workflow -> Add macro to call on use, and merge saves and damage to item cards
// Then add this macro's name to the bottom of the Chain Lightning spell in the "On Use Macro" field

let error = false;
if(typeof args !== 'undefined' && args.length === 0){
    error = `You can't run this macro from the hotbar! This is a callback macro. To use this, enable MidiQOL settings in "Workflow" -> "Add macro to call on use", then add this macro's name to the bottom of the Misty Step spell in the "On Use Macro" field.`;
}

if(!game.modules.get("animated-spell-effects-cartoon")){
    error = `You need to have the module "Jack Kerouac's Animated Spell Effects: Cartoon" installed to run this macro!`;
}

if(!game.modules.get("advanced-macros")?.active){
    let installed = game.modules.get("advanced-macros") && !game.modules.get("advanced-macros").active ? "enabled" : "installed";
    error = `You need to have Advanced Macros ${installed} to run this macro!`;
}

if(!game.modules.get("midi-qol")?.active){
    let installed = game.modules.get("midi-qol") && !game.modules.get("midi-qol").active ? "enabled" : "installed";
    error = `You need to have MidiQOL ${installed} to run this macro!`;
}

if(error){
    ui.notifications.error(error);
    return;
}

const actorD = game.actors.get(args[0].actor._id);
const tokenD = canvas.tokens.get(args[0].tokenId);
const itemD = actorD.items.getName(args[0].item.name);
const spellLevel = args[0].spellLevel ? Number(args[0].spellLevel) : 6;
const targetsToJumpTo = 3 + (spellLevel-6);
const spellSaveDC = args[0].actor.data.attributes.spelldc;

let configSettings = game.settings.get("midi-qol", "ConfigSettings");

async function wait(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function addTokenToText(token, roll, dc){

    return `<div class="midi-qol-flex-container">
      <div class="midi-qol-target-npc-GM midi-qol-target-name" id="${token.id}"> ${token.name}</div>
      <div class="midi-qol-target-npc-Player midi-qol-target-name" id="${token.id}" style="display: none;"> ${token.name}</div>
      <div>
         ${roll >= dc ? "succeeds" : "fails"} with 
        ${roll}
        
      </div>
      <div><img src="${token.data.img}" height="30" style="border:0px"></div>
    </div>`;

}

async function main(){

    let chatMessageContent;
    let chatMessage;
    if(configSettings.mergeCard) {
        chatMessage = await game.messages.get(args[0].itemCardId);
        chatMessageContent = await duplicate(chatMessage?.data?.content ?? "");
    }

    const targetToken = canvas.tokens.get(args[0].hitTargets[0]._id);

    let enemies = canvas.tokens.placeables.filter(function(target){
        return target?.actor?.data?.data?.attributes?.hp?.value > 0
            && canvas.grid.measureDistance(targetToken, target) <= 32.5
            && target !== targetToken
            && target !== tokenD
    });

    let targetList = "";

    for (let target of enemies) {
        targetList += `<tr class='chainLightningToken' id='${target.id}'>
            <td><img src="${target?.data?.img}" width="30" height="30" style="border:0px"> - ${target.name}</td>
            <td><input type="checkbox" class='target' name="${target.id}"></td>
        </tr>`;
    }

    let the_content = `
        <p>Your Chain Lightning can jump to <b>${targetsToJumpTo}</b> targets.</p>
        <form class="flexcol">
            <table width="100%">
                <tbody>
                    <tr><th>Target</th>
                    <th>Jump to</th>
                    </tr>${targetList}
                </tbody>
            </table>
        </form>`;

    new Dialog({
        title: "Select targets for Chain Lightning to jump to",
        content: the_content,
        buttons: {
            one: {
                label: "Damage", callback: async (html) => {

                    $(".chainLightningToken").off("mouseenter").off("mouseleave");
                    let targets = html.find('input.target').filter((index, elem) => {
                        return $(elem).is(":checked")
                    });
                    let damageRoll = new Roll(`${args[0].damageTotal}`).roll();

                    let targetTokens = new Set();
                    let saves = new Set();

                    let newChatmessageContent = false;
                    if(configSettings.mergeCard) newChatmessageContent = $(chatMessageContent);

                    let chains = 0;
                    for(let target of targets){
                        chains++;
                        if(chains > targetsToJumpTo) break;

                        let enemyToken = canvas.tokens.get(target.name)

                        let save = new Roll("1d20+@mod",{mod: enemyToken?.actor?.data?.data?.abilities?.dex?.save ?? 0}).roll();

                        if(!configSettings.mergeCard) save.toMessage({flavor: "Dexterity Saving Throw"});

                        targetTokens.add(enemyToken)
                        if(save.total >= spellSaveDC){
                            saves.add(enemyToken)
                        }

                        if(configSettings.mergeCard){
                            newChatmessageContent.find(".midi-qol-nobox.midi-qol-saves-display").append(
                                $(addTokenToText(enemyToken, save.total, spellSaveDC))
                            );
                        }

                    }

                    if(configSettings.mergeCard) {
                        await chatMessage.update({content: newChatmessageContent.prop('outerHTML')});
                        await ui.chat.scrollBottom();
                    }

                    MidiQOL.applyTokenDamage(
                        [{ damage: args[0].damageTotal, type: "lightning" }],
                        damageRoll.total,
                        targetTokens,
                        itemD,
                        saves
                    )

                    let sequence = new Sequence()
                        .effect()
                        .file("modules/animated-spell-effects-cartoon/spell-effects/cartoon/electricity/lightning_bolt_RECTANGLE_03.webm")
                        .atLocation(tokenD) // Going from origin
                        .reachTowards(targetToken) // To the current loop's target
                        .effect()
                        .file("modules/animated-spell-effects-cartoon/spell-effects/cartoon/electricity/electric_ball_CIRCLE_06.webm")
                        .atLocation(targetToken) // Static on the target
                        .gridSize(100)
                        .scale(0.5)
                        .wait(150) // Slight delay between each arc

                    for(let target of targetTokens){
                        sequence
                            .effect()
                            .file("modules/animated-spell-effects-cartoon/spell-effects/cartoon/electricity/lightning_bolt_RECTANGLE_03.webm")
                            .atLocation(targetToken) // Going from origin
                            .reachTowards(target) // To the current loop's target
                            .effect()
                            .file("modules/animated-spell-effects-cartoon/spell-effects/cartoon/electricity/electric_ball_CIRCLE_06.webm")
                            .atLocation(target) // Static on the target
                            .gridSize(100)
                            .scale(0.5)
                    }

                    sequence.play()

                }
            }
        }
    }).render(true);

    await wait(100);

    $(".chainLightningToken").on("mouseenter", function(e){
        let token = canvas.tokens.get($(this).attr('id'));
        token._onHoverIn(e);
    }).on("mouseleave", function(e){
        let token = canvas.tokens.get($(this).attr('id'));
        token._onHoverOut(e);
    });

}

main()