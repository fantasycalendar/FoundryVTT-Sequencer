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

function getSequencerEffectTokens(version, filter = () => true) {
  return Array.from(game.scenes)
    .map(scene => ([
      scene,
      Array.from(scene.tokens).filter(t => {
        const effects = getProperty(t, CONSTANTS.EFFECTS_FLAG) ?? [];
        const effectsOutOfDate = effects.filter(e => isNewerVersion(e[1], version));
        return effectsOutOfDate.length;
      }).filter(filter)
    ]))
    .filter(([_, tokens]) => tokens.length);
}

const migrations = {

  "3.0.0": async (version) => {

    const tokensOnScenes = getSequencerEffectTokens(version, (token) => {
      return token.actorLink;
    });

    const actorUpdates = {};

    for (const [scene, tokens] of tokensOnScenes) {

      const updates = [];
      for (const token of tokens) {

        const effectsToMoveToActor = getProperty(t, CONSTANTS.EFFECTS_FLAG)
          .filter(([_, effect]) => {
            return effect.persistOptions?.persistTokenPrototype;
          })
          .map(([id, effect]) => {
            effect.version = version;
            return [id, effect];
          });

        if (!actorUpdates[token.actor.id]) actorUpdates[token.actor.id] = [];

        actorUpdates[token.actor.id].push(...effectsToMoveToActor);

        const effectsToKeepOnToken = getProperty(t, CONSTANTS.EFFECTS_FLAG)
          .filter(([_, effect]) => {
            return !effect.persistOptions?.persistTokenPrototype;
          })
          .map(([id, effect]) => {
            effect.version = version;
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
        [CONSTANTS.EFFECTS_FLAG]: effects
      }
    });

    if(actorUpdateArray.length) {
      console.log(`Sequencer | Updated ${actorUpdateArray.length} actors' effects to version ${version}`);
      await Actor.updateDocuments(actorUpdateArray);
    }


  }

};
