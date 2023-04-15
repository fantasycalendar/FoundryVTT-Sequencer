import * as lib from "../lib/lib.js";
import * as canvaslib from "../lib/canvas-lib.js";

export default class SequencerScrollingTextHelper {
  static _validateObject(inObject, sceneId) {
    if (lib.is_UUID(inObject) || !canvaslib.is_object_canvas_data(inObject)) {
      inObject = lib.get_object_from_scene(inObject, sceneId);
      inObject = inObject?._object ?? inObject;
    }
    return inObject;
  }

  static play(data) {
    if (game.user.viewedScene !== data.sceneId) return;
    if (data.users.length && !data.users.includes(game.userId)) return;

    let source = this._validateObject(data.source, data.sceneId);
    source = source?._object ?? source;

    const position =
      source instanceof PlaceableObject
        ? canvaslib.get_object_position(source)
        : source?.worldPosition || source?.center || source;

    const multiplier = data.randomOffset;
    const twister = new MersenneTwister(data.seed);

    if (source && multiplier) {
      let randomOffset = canvaslib.get_random_offset(
        source,
        multiplier,
        twister
      );
      position.x -= randomOffset.x;
      position.y -= randomOffset.y;
    }

    let extraOffset = data.offset;
    if (extraOffset) {
      let newOffset = {
        x: extraOffset.x,
        y: extraOffset.y,
      };
      if (extraOffset.gridUnits) {
        newOffset.x *= canvas.grid.size;
        newOffset.y *= canvas.grid.size;
      }
      if (extraOffset.local) {
        newOffset = canvaslib.rotateAroundPoint(
          0,
          0,
          newOffset.x,
          newOffset.y,
          source?.rotation ?? 0
        );
      }
      position.x -= newOffset.x;
      position.y -= newOffset.y;
    }

    return canvas.interface.createScrollingText(
      position,
      data.content,
      data.options
    );
  }
}
