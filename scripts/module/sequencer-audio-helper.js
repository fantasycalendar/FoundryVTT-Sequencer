import * as lib from "./lib.js";
import { emitSocketEvent, SOCKET_HANDLERS } from "../sockets.js";

export default class SequencerAudioHelper {
    /**
     * Play an audio file.
     *
     * @param {{src: string, loop?: boolean, volume?: number, fadeIn?: {duration: number}, fadeOut?: {duration: number}, duration?: number}} data The data that describes the audio to play.
     * @param {boolean} [push=false] A flag indicating whether or not to make other clients play the audio, too.
     * @returns {Promise<Sound | Howl>} A promise that resolves when the audio file has finished playing.
     */
    static async play(data, push = false) {
        if (push) emitSocketEvent(SOCKET_HANDLERS.PLAY_SOUND, data);

        data.volume = (data.volume ?? 1) * game.settings.get("core", "globalInterfaceVolume");

        if (new lib.Version().onOrAfter("0.8.2")) {
            return this._playOnNewSoundAPI(data);
        } else {
            return this._playOnOldSoundAPI(data);
        }
    }

    /**
     * @param {{src: string, loop?: boolean, volume: number, fadeIn?: {duration: number}, fadeOut?: {duration: number}, duration?: number}} data
     * @returns {Promise<Sound>}
     * @private
     */
    static async _playOnNewSoundAPI(data) {
        const sound = await game.audio.play(data.src, {
            volume: data.fadeIn ? 0 : data.volume,
            loop: data.loop,
        });

        if (data.fadeIn) {
            sound.fade(data.volume, { duration: data.fadeIn.duration });
        }

        if (data.fadeOut) {
            setTimeout(() => {
                if (sound.playing) {
                    sound.fade(0, { duration: data.fadeOut.duration });
                }
            }, Math.max((data.duration ?? sound.duration) - data.fadeOut.duration, 0));
        }

        if (data.duration !== undefined) {
            setTimeout(() => {
                sound.stop();
            }, data.duration);
        }

        return new Promise((resolve) => {
            sound.on("stop", resolve);
            sound.on("end", resolve);
        });
    }

    /**
     * @param {{src: string, loop?: boolean, volume: number, fadeIn?: {duration: number}, fadeOut?: {duration: number}, duration?: number}} data
     * @returns {Promise<Howl>}
     * @private
     */
    static async _playOnOldSoundAPI(data) {
        const howl = new Howl({
            src: [data.src],
            loop: data.loop,
            volume: data.fadeIn ? 0 : data.volume,
            autoplay: true,
        });

        if (data.fadeIn) {
            howl.fade(0, data.volume, data.fadeIn.duration);
        }

        if (data.fadeOut) {
            setTimeout(() => {
                if (howl.playing()) {
                    howl.fade(howl.volume() ?? data.volume, 0, data.fadeOut.duration);
                }
            }, Math.max((data.duration ?? howl.duration()) - data.fadeOut.duration, 0));
        }

        if (data.duration !== undefined) {
            setTimeout(() => {
                howl.stop();
            }, data.duration);
        }

        return new Promise((resolve) => {
            howl.on("stop", resolve);
            howl.on("end", resolve);
        });
    }
}
