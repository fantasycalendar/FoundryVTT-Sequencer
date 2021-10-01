import registerSettings from "./settings.js";
import { registerSocket } from "./sockets.js";
import registerLayers from "./layers.js";
import Sequence from "./module/sequencer.js";
import SequencerPreloader from "./module/sequencer-preloader.js";
import SequencerDatabase from "./module/sequencer-database.js";
import SequencerDatabaseViewer from "./module/formapplications/sequencer-database-viewer.js";
import SequencerEffectManager from "./module/sequencer-effect-manager.js";
import { registerEase } from "./module/canvas-effects/ease.js";
import Section from "./module/sections/section.js";
import SequencerSectionManager from "./module/sequencer-section-manager.js";
import SequencerUILayer from "./module/canvas-effects/ui-layer.js";
import { libWrapper } from "./module/lib/libWrapper/shim.js";

Hooks.once('init', async function () {

    window.Sequence = Sequence;
    window.Sequencer = {
        Database: SequencerDatabase,
        DatabaseViewer: SequencerDatabaseViewer,
        Preloader: SequencerPreloader,
        EffectManager: SequencerEffectManager,
        SectionManager: new SequencerSectionManager(),
        registerEase: registerEase,
        BaseSection: Section,
        UILayer: new SequencerUILayer()
    }

    registerLayers();

    window.SequencerPreloader = Sequencer.Preloader;
    window.SequencerDatabase = Sequencer.Database;
    window.SequencerDatabaseViewer = Sequencer.DatabaseViewer;
    window.SequencerEffectManager = Sequencer.EffectManager;

    registerSettings();
    registerSocket();

    if(game.settings.get('sequencer', 'experimentalRenderPatch')) {
        libWrapper.register("sequencer", "PIXI.resources.BaseImageResource.prototype.upload", RENDERPATCH);
    }

});

Hooks.on("canvasReady", () => {
    Sequencer.EffectManager._setUpPersists();
});

Hooks.once('ready', async function () {
    setTimeout(() => {
        console.log("Sequencer | Ready to go!")
        Hooks.call('sequencer.ready')
    }, 100);
});

function RENDERPATCH(wrapped, ...args){

    let renderer = args[0];
    let baseTexture = args[1];
    let source = args[3];
    source = source || this.source;

    const isNotVideo = !source.videoWidth
    if(isNotVideo) return wrapped(...args);

    const gl = renderer.gl;
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, PIXI.ALPHA_MODES.UNPACK_PREMULTIPLY_ALPHA_WEBGL);
    gl.texImage2D(baseTexture.target, 0, baseTexture.format, baseTexture.format, baseTexture.type, source);
    return true;

}

/**
 * Creation & delete hooks for persistent effects
 */

Hooks.on("createToken", (document) => {
    if(!document.data?.flags?.sequencer?.effects) return;
    const effects = Sequencer.EffectManager._patchCreationData(document);
    document.data.update({"flags.sequencer.effects": effects});
});

Hooks.on("createTile", (document) => {
    if(!document.data?.flags?.sequencer?.effects) return;
    const effects = Sequencer.EffectManager._patchCreationData(document);
    document.data.update({"flags.sequencer.effects": effects});
});

Hooks.on("createMeasuredTemplate", (document) => {
    if(!document.data?.flags?.sequencer?.effects) return;
    const effects = Sequencer.EffectManager._patchCreationData(document);
    document.data.update({"flags.sequencer.effects": effects});
});

Hooks.on("preDeleteToken", (obj) => {
    Sequencer.EffectManager._tearDownPersists(obj.id);
});

Hooks.on("preDeleteTile", (obj) => {
    Sequencer.EffectManager._tearDownPersists(obj.id);
});

Hooks.on("preDeleteMeasuredTemplate", (obj) => {
    Sequencer.EffectManager._tearDownPersists(obj.id);
});