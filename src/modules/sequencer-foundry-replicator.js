import * as lib from "../lib/lib.js";
import * as canvaslib from "../lib/canvas-lib.js";
import { sequencerSocket, SOCKET_HANDLERS } from "../sockets.js";
import FoundryShim from "../utils/foundry-shim.js";

let lockedView = false;

export default class SequencerFoundryReplicator {
  static registerHooks() {
    Hooks.on("canvasPan", () => {
      if (!lockedView) return;
      canvas.stage.pivot.set(lockedView.x, lockedView.y);
      canvas.stage.scale.set(lockedView.scale, lockedView.scale);
      canvas.updateBlur(lockedView.scale);
      canvas.controls._onCanvasPan();
      canvas.hud.align();
    });
  }

  static playScrollingText(data, push = true) {
    if (push) {
      sequencerSocket.executeForOthers(
        SOCKET_HANDLERS.CREATE_SCROLLING_TEXT,
        data
      );
    }
    return this._playScrollingText(data);
  }

  static _playScrollingText(data) {
    if (game.user.viewedScene !== data.sceneId) return;
    if (data.users.length && !data.users.includes(game.userId)) return;

    canvas.interface.createScrollingText(
      canvaslib.getPositionFromData(data),
      data.content,
      data.options
    );

    return data.options?.duration ?? 2000;
  }

  static panCanvas(data, push = true) {
    if (push) {
      sequencerSocket.executeForOthers(SOCKET_HANDLERS.PAN_CANVAS, data);
    }

    return this._panCanvas(data);
  }

  static _panCanvas(data) {
    if (game.user.viewedScene !== data.sceneId) return;
    if (data.users.length && !data.users.includes(game.userId)) return;

    if (data.source) {
      const position = canvaslib.getPositionFromData(data);

      canvas.animatePan({
        x: position.x,
        y: position.y,
        scale: data.scale,
        duration: data.duration,
        speed: data.speed,
      });

      if (data.speed) {
        let ray = new Ray(canvas.stage.pivot, {
          x: position.x,
          y: position.y,
        });
        data.duration = Math.round((ray.distance * 1000) / data.speed);
      }

      if (data.lockView > 0) {
        setTimeout(() => {
          lockedView = {
            x: position.x,
            y: position.y,
            scale: data.scale,
          };
        }, data.duration);
        setTimeout(() => {
          lockedView = false;
        }, data.lockView + data.duration);
      }
    } else {
      data.duration = 0;
    }

    if (data.shake) {
      setTimeout(() => {
        this._shake(data.shake);
      }, data.duration);
    }

    return (
      data.duration + Math.max(data.lockView ?? 0, data.shake?.duration ?? 0)
    );
  }

  static _shake(shakeData) {

	  if(!shakeData.duration || !shakeData.frequency) return;

    let x = lib.random_float_between(-1, 1);
    let y = lib.random_float_between(-1, 1);
    let rot = shakeData.rotation ? lib.random_float_between(-1, 1) : 0;
    let positions = [{ x, y, rot }];

		for (
			let index = 0;
			index < Math.floor(shakeData.duration / shakeData.frequency);
			index++
		) {
			x = lib.flip_negate(x, Math.random());
			y = lib.flip_negate(y, Math.random());
			rot = shakeData.rotation ? lib.flip_negate(rot, Math.random()) : 0;
			positions.push({ x, y, rot });
		}

    let currentDuration = 0;
    positions = positions.map((pos) => {
      let fadeStrength = 1;
      if (
        shakeData.fadeInDuration &&
        currentDuration <= shakeData.fadeInDuration
      ) {
        fadeStrength = Math.max(
          0,
          Math.min(1, currentDuration / shakeData.fadeInDuration)
        );
      }
      if (
        shakeData.fadeOutDuration &&
        currentDuration >= shakeData.duration - shakeData.fadeOutDuration
      ) {
        fadeStrength = Math.max(
          0,
          Math.min(
            1,
            (shakeData.duration - currentDuration) / shakeData.fadeOutDuration
          )
        );
      }
      pos.x *= shakeData.strength * fadeStrength;
      pos.y *= shakeData.strength * fadeStrength;
      if (shakeData.rotation) {
        pos.rot *= (shakeData.strength / 7.5) * fadeStrength;
      } else {
        pos.rot = 0;
      }
      currentDuration += shakeData.frequency;
      return {
        transform: `translate(${pos.x}px, ${pos.y}px) rotate(${pos.rot}deg)`,
      };
    });

    document.getElementById("board").animate(positions, {
      duration: shakeData.duration,
    });
  }

	static createEmbeddedDocument(){

	}
}
