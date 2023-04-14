import CONSTANTS from "./constants.js";
import { custom_warning } from "./lib/lib.js";

export default async function runMigrations() {

  const sortedMigrations = Object.entries(migrations)
    .sort((a, b) => {
      return isNewerVersion(b[0], a[0]) ? -1 : 1;
    });

  for (const [version, migration] of sortedMigrations) {
    try {
      await migration(version);
    } catch (err) {
      custom_warning("Sequencer", `Something went wrong when migrating to version ${version}. Please check the console for the error!`, true)
      console.error(err);
    }
  }
}

function getSequencerEffectTokens(version, tokenFilter = (t) => {
  const effects = getProperty(t, CONSTANTS.EFFECTS_FLAG) ?? [];
  const effectsOutOfDate = effects.filter(e => isNewerVersion(version, e[1].flagVersion));
  return effectsOutOfDate.length;
}) {
  return Array.from(game.scenes)
    .map(scene => ([
      scene,
      Array.from(scene.tokens).filter(tokenFilter)
    ]))
    .filter(([_, tokens]) => tokens.length);
}

const migrations = {

  "3.0.0": async (version) => {

    const tokensOnScenes = getSequencerEffectTokens(version, (t) => {
      const effects = getProperty(t, CONSTANTS.EFFECTS_FLAG) ?? [];
      const prototypeTokenEffects = getProperty(t.actor, "prototypeToken."+CONSTANTS.EFFECTS_FLAG) ?? [];
      const effectsOutOfDate = effects.filter(e => isNewerVersion(version, e[1].flagVersion));
      const prototypeEffectsOutOfDate = prototypeTokenEffects.filter(e => isNewerVersion(version, e[1].flagVersion));
      return effectsOutOfDate.length || prototypeEffectsOutOfDate.length;
    });

    const actorUpdates = {};
    const actorTokenPrototypeUpdates = {};

    for (const [scene, tokens] of tokensOnScenes) {

      const updates = [];
      for (const token of tokens) {

        const effectsToMoveFromTokenPrototype = getProperty(token.actor.prototypeToken, CONSTANTS.EFFECTS_FLAG)
          .filter(([_, effect]) => {
            return effect.persistOptions?.persistTokenPrototype;
          })
          .map(([id, effect]) => {
            effect.flagVersion = version;
            effect.source = token.uuid;
            return [id, effect];
          });

        const effectsToKeepOnTokenPrototype = getProperty(token.actor.prototypeToken, CONSTANTS.EFFECTS_FLAG)
          .filter(([_, effect]) => {
            return !effect.persistOptions?.persistTokenPrototype;
          })
          .map(([id, effect]) => {
            effect.flagVersion = version;
            return [id, effect];
          });

        if (!actorUpdates[token.actor.id]) actorUpdates[token.actor.id] = [];
        if (!actorTokenPrototypeUpdates[token.actor.id]) actorTokenPrototypeUpdates[token.actor.id] = [];

        actorUpdates[token.actor.id].push(...effectsToMoveFromTokenPrototype);
        actorTokenPrototypeUpdates[token.actor.id].push(...effectsToKeepOnTokenPrototype)

        const effectsToKeepOnToken = getProperty(token, CONSTANTS.EFFECTS_FLAG)
          .filter(([_, effect]) => {
            return !effect.persistOptions?.persistTokenPrototype;
          })
          .map(([id, effect]) => {
            effect.flagVersion = version;
            return [id, effect];
          });

        updates.push({
          _id: token.id,
          [CONSTANTS.EFFECTS_FLAG]: effectsToKeepOnToken
        });
      }

      if(updates.length) {
        console.log(`Sequencer | Updated ${updates.length} tokens' effects on scene ${scene.id} to version ${version}`);
        await scene.updateEmbeddedDocuments("Token", updates);
      }

    }

    const actorUpdateArray = Object.entries(actorUpdates).map(([actorId, effects]) => {
      return {
        _id: actorId,
        [CONSTANTS.EFFECTS_FLAG]: effects,
        ["prototypeToken." + CONSTANTS.EFFECTS_FLAG]: actorTokenPrototypeUpdates[actorId]
      }
    });

    if(actorUpdateArray.length) {
      console.log(`Sequencer | Updated ${actorUpdateArray.length} actors' effects to version ${version}`);
      await Actor.updateDocuments(actorUpdateArray);
    }

  }

};
