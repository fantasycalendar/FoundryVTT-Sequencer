import { sequencerSocket, SOCKET_HANDLERS } from "../sockets.js";
import SequencerAnimationEngine from "./sequencer-animation-engine.js";
import * as lib from "../lib/lib.js";
import SequenceManager from "./sequence-manager.js";

export default class SequencerAudioHelper {
  /**
   * Play an audio file.
   *
   * @param {{src: string, loop?: boolean, volume?: number, _fadeIn?: {duration: number}, _fadeOut?: {duration: number}, duration?: number}} data The data that describes the audio to play.
   * @param {boolean} [push=false] A flag indicating whether or not to make other clients play the audio, too.
   * @returns {Number} A promise that resolves when the audio file has finished playing.
   */
  static async play(data, push = true) {
    if (push)
      sequencerSocket.executeForOthers(SOCKET_HANDLERS.PLAY_SOUND, data);
    return this._play(data);
  }

  /**
   * @param {{src: string, loop?: boolean, volume: number, _fadeIn?: {duration: number}, _fadeOut?: {duration: number}, duration?: number}} data
   * @returns {Number}
   * @private
   */
  static async _play(data) {
    if (
      !game.settings.get("sequencer", "soundsEnabled") ||
      game.user.viewedScene !== data.sceneId ||
      (data?.users?.length && !data?.users?.includes(game.userId))
    ) {
      return new Promise((resolve) => setTimeout(resolve, data.duration));
    }

    Hooks.callAll("createSequencerSound", data);

    lib.debug(`Playing sound:`, data);

    data.volume =
      (data.volume ?? 0.8) * game.settings.get("core", "globalInterfaceVolume");

    const sound = await game.audio.play(data.src, {
      volume: data.fadeIn ? 0 : data.volume,
      loop: data.loop,
      offset: data.startTime,
    });

    SequenceManager.RunningSounds.add(data.id, sound);

    if (data.fadeIn) {
      SequencerAnimationEngine.addAnimation(data.id, {
        target: sound,
        propertyName: "volume",
        from: 0.0,
        to: data.volume,
        duration: Math.min(data.fadeIn.duration, data.duration),
        ease: data.fadeIn.ease,
        delay: Math.min(data.fadeIn.delay, data.duration),
      });
    }

    if (data.fadeOut) {
      SequencerAnimationEngine.addAnimation(data.id, {
        target: sound,
        propertyName: "volume",
        from: data.volume,
        to: 0.0,
        duration: Math.min(data.fadeOut.duration, data.duration),
        ease: data.fadeOut.ease,
        delay: Math.max(
          data.duration - data.fadeOut.duration + data.fadeOut.delay,
          0
        ),
      });
    }

    if (data.duration) {
      setTimeout(() => {
        sound.stop();
      }, data.duration);
    }

    new Promise((resolve) => {
      sound.on("stop", resolve);
      sound.on("end", resolve);
    }).then(() => {
      SequenceManager.RunningSounds.delete(data.id);
      Hooks.callAll("endedSequencerSound", data);
    });

    return data.duration;
  }

  static stop(ids, push = true) {
    if (push && game.user.isGM)
      sequencerSocket.executeForOthers(SOCKET_HANDLERS.STOP_SOUNDS, ids);
    return this._stop(ids);
  }

  static _stop(ids) {
    for (const id of ids) {
      const sound = SequenceManager.RunningSounds.get(id);
      if (sound) {
        sound.stop();
      }
    }
  }
}
