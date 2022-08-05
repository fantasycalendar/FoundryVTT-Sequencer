// ---------------------------
// MAP
const letter_a = { x: 231.1892510005717, y: 445.45454545454555 }; // ok
const letter_b = { x: 292.1097770154374, y: 404.8885077186964 }; // ok
const letter_c = { x: 349.28530588907967, y: 379.0451686678102 }; // ok
const letter_d = { x: 404.3739279588336, y: 361.1206403659233 };
const letter_e = { x: 461.7209834190966, y: 348.8564894225272 };
const letter_f = { x: 514.9228130360204, y: 336.79245283018867 }; // ok
const letter_g = { x: 577.1869639794168, y: 333.96226415094344 };
const letter_h = { x: 637.9073756432248, y: 333.01886792452837 };
const letter_i = { x: 691.1092052601487, y: 334.9056603773585 };
const letter_j = { x: 738.8507718696399, y: 340.3659233847914 };
const letter_k = { x: 801.2864493996568, y: 353.94511149228146 };
const letter_l = { x: 862.607204116638, y: 375.2715837621499 };
const letter_m = { x: 928.2447112635791, y: 402.42995997712984 };
const letter_n = { x: 999.5425957690106, y: 437.70726129216706 };
const letter_o = { x: 257.8044596912522, y: 517.3241852487137 };
const letter_p = { x: 311.0062893081762, y: 490.53744997141234 }; // ok
const letter_q = { x: 373.0703259005145, y: 467.52429959977144 };
const letter_r = { x: 433.2475700400228, y: 447.54145225843365 };
const letter_s = { x: 495.31160663236125, y: 430.9319611206406 }; // ok
const letter_t = { x: 550.7718696397942, y: 422.2698684962837 };
const letter_u = { x: 612.264150943396, y: 419.81132075471714 };
const letter_v = { x: 679.4168096054887, y: 418.29616923956564 };
const letter_w = { x: 758.8336192109775, y: 434.13379073756437 };// ok
const letter_x = { x: 848.1132075471695, y: 463.2075471698115 };
const letter_y = { x: 914.1509433962261, y: 489.6226415094342 };
const letter_z = { x: 971.698113207547, y: 522.6415094339625 };

const number_1 = { x: 340.8233276157804, y: 591.8524871355062 };
const number_2 = { x: 394.9685534591192, y: 591.2807318467698 };
const number_3 = { x: 453.2590051457976, y: 594.8827901658092 };
const number_4 = { x: 512.2927387078329, y: 597.7129788450545 };
const number_5 = { x: 570.583190394511, y: 596.9696969696971 };
const number_6 = { x: 627.3584905660376, y: 599.0566037735852 };
const number_7 = { x: 679.5883361921095, y: 594.139508290452 };
const number_8 = { x: 735.4202401372212, y: 592.9959977129793 };
const number_9 = { x: 791.8238993710692, y: 590.5374499714126 };
const number_0 = { x: 860.491709548313, y: 591.109205260149 };

const symbol_yes = { x: 321.5551743853629, y: 229.81703830760478 };
const symbol_no = { x: 906.7467124070897, y: 227.73013150371685 };

const symbol_space = { x: 603.7735849056602, y: 233.96226415094372 };

const symbol_01 = { x: 608.3190394511147, y: 697.5986277873074 };
const symbol_02 = { x: 639.9536577292289, y: 699.8675935120822 };
const symbol_03 = { x: 639.9536577292289, y: 699.8675935120822 };
const symbol_04 = { x: 639.9536577292289, y: 699.8675935120822 };
const symbol_05 = { x: 639.9536577292289, y: 699.8675935120822 };
const symbol_06 = { x: 639.9536577292289, y: 699.8675935120822 };

const bottomLocation = { x: 607.1601354620223, y: 785.2926947266571 };

// YOU CAN TRY TO MESS WITH THIS
let soundToPlay = 'modules/sequencer/samples/OujiaBoard/assets_sounds_distant-orchestra.ogg';
let animation = 'modules/animated-spell-effects-cartoon/spell-effects/cartoon/mix/electric_ball_CIRCLE_09.webm';

let soundToPlayEnd = 'modules/sequencer/samples/OujiaBoard/assets_sounds_intensive-stare.ogg';
let animationEnd = 'modules/animated-spell-effects-cartoon/spell-effects/cartoon/misc/demon_face_SQUARE.webm';

/* Ouija Board Control
Source:
Icon: icons/tools/scribal/lens-grey-brown.webp
*/

const debug = true;
const version =  'v1.3';
let tokenD;

if (canvas.tokens.controlled[0]===undefined){
    ui.notifications.error("You must select a token!");
} else {
    tokenD=canvas.tokens.controlled[0];
    main();
}


function main() {
    let alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'.split('');
    let alphabetList = ``;
    let special = 'yes,no'.split(',');
    alphabet = alphabet.concat(special);
    alphabet.map((t) => {
        alphabetList += `<input type="radio" id="${t}" name="target" value="${t}"><label for="${t}">${t} </label>`;
    });
    
    let choosenMessage = chooseMessage();
    
    let template = `
    <style type="text/css">
      div.purpleHorizon {
        border: 4px solid #ff0000;
        background-color: #000000;
        width: 100%;
        text-align: center;
        border-collapse: collapse;
      }
      .divTable.purpleHorizon .divTableCell, .divTable.purpleHorizon .divTableHead {
        border: 0px solid #550000;
        padding: 5px 2px;
      }
      .divTable.purpleHorizon .divTableBody .divTableCell {
        font-size: 13px;
        font-weight: bold;
        color: #FFFFFF;
      }
      
      .divTable{ display: table; }
      .divTableRow { display: table-row; }
      .divTableHeading { display: table-header-group;}
      .divTableCell, .divTableHead { display: table-cell;}
      .divTableHeading { display: table-header-group;}
      .divTableFoot { display: table-footer-group;}
      .divTableBody { display: table-row-group;}
      /* RADIO */
      [type=radio] {
        background-color:white;
      }
      /* IMAGE STYLES */
      [type=radio] + img {
      cursor: pointer;
      }
      /* CHECKED STYLES */
      [type=radio]:checked + img {
      outline: 4px solid #f00;
      }
      
      .container {
        position: relative;
        text-align: center;
        color: white;
      }
      /* Centered text */
      .centered {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 18px;
      }
      #kultcss .window-content {
        background: #000000;
      }
      #kultcss .dialog-button {
        height: 40px;
        background: #000000;
        color: #ffffff;
        justify-content: space-evenly;
        align-items: center;
        cursor: pointer;
        border: none;
      }
      #kultcss header {
        background: #000000;
        border-radius: 0;
        border: none;
        margin-bottom: 2px;
        font-size: .75rem;
      }
    </style>
    
    <div class="divTable purpleHorizon">
    <div class="divTableBody">
    
    <div class="divTableRow">
    <div class="divTableCell">
        <p>${choosenMessage}</p>
    </div>
    </div>
    <div class="divTableRow">
    <div class="divTableCell">
        <p>Message</p>
        <input id="message" type="text" style="width: 320px; box-sizing: border-box;border: none;background-color: #ff0000;color: white; text-align: center;" value="wasp">
    </div>
    </div>
    <div class="divTableRow">
    <div class="divTableCell">
      <p>Choose instead of the message:</p>
      <input type="radio" id="position_yes" name="extra_position" value="message" checked="checked>
      <label for="support_0">Message</label>
      <input type="radio" id="position_yes" name="extra_position" value="position_yes">
      <label for="support_0">Yes</label>
      <input type="radio" id="position_no" name="extra_position" value="position_no">
      <label for="support_1">No</label>
      <input type="radio" id="position_01" name="extra_position" value="position_01">
      <label for="support_1">Extra 01</label>
      <input type="radio" id="position_02" name="extra_position" value="position_02">
      <label for="support_1">Extra 02</label>
      <input type="radio" id="position_03" name="extra_position" value="position_03">
      <label for="support_1">Extra 03</label>
      <input type="radio" id="position_04" name="extra_position" value="position_04">
      <label for="support_1">Extra 04</label>
      <input type="radio" id="position_05" name="extra_position" value="position_05">
      <label for="support_1">Extra 05</label>
      <input type="radio" id="position_06" name="extra_position" value="position_06">
      <label for="support_1">Extra 06</label>
    </div>
    </div>
    <div class="divTableRow">
    <div class="divTableCell">
      <label for="movetype">Move Type: <select id="movetype" style="width: 250px; box-sizing: border-box;border: none;background-color: #ff0000;color: white; text-align: center;">
      <option value="moveType1">Type 1</option>
      <option value="moveType2">Type 2 - No Sound</option>
      <option value="moveType3">Type 3 - Animation</option>
      <option value="moveType4">Type 4 - End</option>
      </select></label>
    </div>
    </div>
    <div class="divTableRow">
    <div class="divTableCell">
        <label for="extraTime">Delay (ms):
        <input id="extraTime" type="number" min=1 max=5000 style="width: 80px; box-sizing: border-box;border: none;background-color: #ff0000;color: white; text-align: center;" value=1></label>
    </div>
    </div>
    </div>
    </div>
  `;
    
    new Dialog({
        title: `Ouija - ${version}`,
        content: template,
        buttons: {
            ok: {
                label: "Move",
                callback: async (html) => {
                    moveThing(html);
                },
            },
            cancel: {
                label: "Cancel",
            },
        },
    }).render(true);
}

async function moveThing(html) {
    let msg = '';
    const movetype = html.find('#movetype')[0].value;
    let autoMessage =  html.find("#message")[0].value;
    let extraTime =  html.find("#extraTime")[0].value;
    let messageType = html.find('input[name="extra_position"]:checked')[0].value;
    const moveFunction = await selectMoveFunction(movetype);
    
    if ( messageType=='message' ) { // message
        sendMessage(autoMessage.toLowerCase(), moveFunction, extraTime);
    } else { // extra_position
        sendToPosition(messageType.toLowerCase(), moveFunction, extraTime);
    }
}

async function move3(position, extraTime=1) {
    let sequence = new Sequence()
        .animation()
        .on(tokenD)
        .duration(1000)
        .moveTowards(position, { ease: "easeInOutCubic" } )
        .rotateTowards(bottomLocation, { duration: 1000, ease: "easeInOutCubic" })
        .waitUntilFinished()
        .sound(soundToPlay)
        .effect()
        .file(animation)
        .attachTo(tokenD)
        .scaleToObject(0.75)
        .spriteOffset({ y: -0.33 }, { gridUnits: true })
        .waitUntilFinished()
        .wait(extraTime);
    
    await sequence.play();
}

async function move2(position, extraTime=1) {
    let sequence = new Sequence()
        .animation()
        .on(tokenD)
        .duration(1000)
        .moveTowards(position, { ease: "easeInOutCubic" } )
        .rotateTowards(bottomLocation, { duration: 1000, ease: "easeInOutCubic" })
        .waitUntilFinished()
        .wait(extraTime);
    
    await sequence.play();
}

async function move(position, extraTime=1) {
    let sequence = new Sequence()
        .animation()
        .on(tokenD)
        .duration(1000)
        .moveTowards(position, { ease: "easeInOutCubic" } )
        .rotateTowards(bottomLocation, { duration: 1000, ease: "easeInOutCubic" })
        .waitUntilFinished()
        .sound(soundToPlay)
        .wait(200)
        .wait(extraTime);
    
    await sequence.play();
}

async function moveEnd(position, extraTime=1) {
    let sequence = new Sequence()
        .animation()
        .on(tokenD)
        .duration(1000)
        .moveTowards(position, { ease: "easeInOutCubic" } )
        .rotateTowards(bottomLocation, { duration: 1000, ease: "easeInOutCubic" })
        .waitUntilFinished()
        .sound(soundToPlayEnd)
        .effect()
        .file(animationEnd)
        .atLocation(tokenD)
        .scale(0.55)
        .waitUntilFinished()
        .wait(extraTime);
    
    await sequence.play();
}

async function sendMessage(text, moveFunction, extraTime=1) {
    let message = text.split('');
    
    for (let index = 0; index < message.length; index++) {
        const myMessage = message[index];
        const output = await moveFunction(sceneMap(myMessage), extraTime);
    }
}

async function sendToPosition(text, moveFunction, extraTime=1) {
    await moveFunction(sceneMap(text), extraTime);
}

async function selectMoveFunction(moveType) {
    if (moveType=='moveType1') {
        return move;
    } else if (moveType=='moveType2') {
        return move2;
    } else if (moveType=='moveType3') {
        return move3;
    } else if (moveType=='moveType4') {
        return moveEnd;
    }
}

// ================================================================
function sceneMap(message) {
// canvas.tokens.controlled[0].position.x
// canvas.tokens.controlled[0].position.y
    
    // 1 char
    switch (message) {
        case 'a': return letter_a; // ok
        case 'b': return letter_b; // ok
        case 'c': return letter_c; // ok
        case 'd': return letter_d;
        case 'e': return letter_e;
        case 'f': return letter_f; // ok
        case 'g': return letter_g;
        case 'h': return letter_h;
        case 'i': return letter_i;
        case 'j': return letter_j;
        case 'k': return letter_k;
        case 'l': return letter_l;
        case 'm': return letter_m;
        case 'n': return letter_n;
        case 'o': return letter_o;
        case 'p': return letter_p; // ok
        case 'q': return letter_q;
        case 'r': return letter_r;
        case 's': return letter_s; // ok
        case 't': return letter_t;
        case 'u': return letter_u;
        case 'v': return letter_v;
        case 'x': return letter_x;
        case 'z': return letter_z;
        case 'w': return letter_w; // ok
        case 'y': return letter_y;
        case '0': return number_0;
        case '1': return number_1;
        case '2': return number_2;
        case '3': return number_3;
        case '4': return number_4;
        case '5': return number_5;
        case '6': return number_6;
        case '7': return number_7;
        case '8': return number_8;
        case '9': return number_9;
        case ' ': return symbol_space;
        case 'position_yes':  return symbol_yes;
        case 'position_no':   return symbol_no;
        case 'position_01':   return symbol_01;
        case 'position_02':   return symbol_02;
        case 'position_03':   return symbol_03;
        case 'position_04':   return symbol_04;
        case 'position_05':   return symbol_05;
        case 'position_06':   return symbol_06;
        default: ui.notifications.error("666!");
    }
}

function chooseMessage() {
    let messages = [
        "Captain Howdy is looking for you",
        "Perform the whole ritual in a consecrated circle, so that undesirable spirits cannot interfere with it.",
        "Never look behind you while speaking with the dead.",
        "Playing with spirits may bring you dire consequences."
    ]
    return messages[Math.floor(Math.random() * messages.length)];
}