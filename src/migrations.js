import CONSTANTS from "./constants.js";
import { custom_warning } from "./lib/lib.js";

export default async function runMigrations() {
  const sortedMigrations = Object.entries(migrations).sort((a, b) => {
    return isNewerVersion(b[0], a[0]) ? -1 : 1;
  });

  for (const [version, migration] of sortedMigrations) {
    try {
      await migration(version);
    } catch (err) {
      custom_warning(
        "Sequencer",
        `Something went wrong when migrating to version ${version}. Please check the console for the error!`,
        true
      );
      console.error(err);
    }
  }
}

function getSequencerEffectTokens(version, tokenFilter = false) {
  return Array.from(game.scenes)
    .map((scene) => [
      scene,
      Array.from(scene.tokens).filter((token, index) => {
        if (tokenFilter) {
          return tokenFilter(token, index);
        }
        const effects = getProperty(token, CONSTANTS.EFFECTS_FLAG) ?? [];
        const effectsOutOfDate = effects.filter((e) =>
          isNewerVersion(version, e[1].flagVersion)
        );
        return effectsOutOfDate.length;
      }),
    ])
    .filter(([_, tokens]) => tokens.length);
}

function getSequencerEffectActors(version, actorFilter = false) {
  return Array.from(game.actors).filter((actor, index) => {
    if (actorFilter) {
      return actorFilter(actor, index);
    }
    const effects = getProperty(actor, CONSTANTS.EFFECTS_FLAG) ?? [];
    const effectsOutOfDate = effects.filter((e) =>
      isNewerVersion(version, e[1].flagVersion)
    );
    return effectsOutOfDate.length;
  });
}

const migrations = {
  "3.0.0": async (version) => {
    const actorsToUpdate = getSequencerEffectActors(version, (actor) => {
      const effects =
        getProperty(actor, "prototypeToken." + CONSTANTS.EFFECTS_FLAG) ?? [];
      const effectsOutOfDate = effects.filter((e) =>
        isNewerVersion(version, e[1].flagVersion)
      );
      return effectsOutOfDate.length;
    });

    const actorUpdateArray = actorsToUpdate.map((actor) => {
      const effectsToMoveFromTokenPrototype = getProperty(
        actor.prototypeToken,
        CONSTANTS.EFFECTS_FLAG
      )
        .filter(([_, effect]) => {
          return effect.persistOptions?.persistTokenPrototype;
        })
        .map(([id, effect]) => {
          effect.flagVersion = version;
          return [id, effect];
        });

      const effectsToKeepOnTokenPrototype = getProperty(
        actor.prototypeToken,
        CONSTANTS.EFFECTS_FLAG
      )
        .filter(([_, effect]) => {
          return !effect.persistOptions?.persistTokenPrototype;
        })
        .map(([id, effect]) => {
          effect.flagVersion = version;
          return [id, effect];
        });

      return {
        _id: actor.id,
        [CONSTANTS.EFFECTS_FLAG]: effectsToMoveFromTokenPrototype,
        ["prototypeToken." + CONSTANTS.EFFECTS_FLAG]:
          effectsToKeepOnTokenPrototype,
      };
    });

    const tokensOnScenes = getSequencerEffectTokens(version, (t) => {
      let actor;
      try {
        actor = t.actor;
      } catch (err) {
        return false;
      }
      const effects = getProperty(t, CONSTANTS.EFFECTS_FLAG) ?? [];
      const prototypeTokenEffects =
        getProperty(actor, "prototypeToken." + CONSTANTS.EFFECTS_FLAG) ?? [];
      const effectsOutOfDate = effects.filter((e) =>
        isNewerVersion(version, e[1].flagVersion)
      );
      const prototypeEffectsOutOfDate = prototypeTokenEffects.filter((e) =>
        isNewerVersion(version, e[1].flagVersion)
      );
      return (
        t.actorLink &&
        (effectsOutOfDate.length || prototypeEffectsOutOfDate.length)
      );
    });

    for (const [scene, tokens] of tokensOnScenes) {
      const updates = [];
      for (const token of tokens) {
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
          [CONSTANTS.EFFECTS_FLAG]: effectsToKeepOnToken,
        });
      }

      if (updates.length) {
        console.log(
          `Sequencer | Updated ${updates.length} tokens' effects on scene ${scene.id} to version ${version}`
        );
        await scene.updateEmbeddedDocuments("Token", updates);
      }
    }

    if (actorUpdateArray.length) {
      console.log(
        `Sequencer | Updated ${actorUpdateArray.length} actors' effects to version ${version}`
      );
      await Actor.updateDocuments(actorUpdateArray);
    }
  },
};
