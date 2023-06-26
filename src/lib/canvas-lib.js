import * as lib from "./lib.js";
import CanvasEffect from "../canvas-effects/canvas-effect.js";
import CONSTANTS from "../constants.js";

export function createShape(shape) {
  const graphic = new PIXI.Graphics();

  graphic.beginFill(
    shape?.fillColor ?? 0xffffff,
    shape?.fillColor !== undefined ? shape?.fillAlpha ?? 1 : 0
  );

  graphic.lineStyle(
    shape.lineSize ?? (shape?.lineColor !== undefined ? 1 : 0),
    shape?.lineColor ?? 0xffffff
  );

  const offsetX =
    (shape.offset?.x ?? 0) * (shape.offset?.gridUnits ? canvas.grid.size : 1);
  const offsetY =
    (shape.offset?.y ?? 0) * (shape.offset?.gridUnits ? canvas.grid.size : 1);
  const sizeMultiplier = shape.gridUnits ? canvas.grid.size : 1;

  graphic.offset = {
    x: offsetX,
    y: offsetY,
  };

  switch (shape.type) {
    case CONSTANTS.SHAPES.CIRC:
      graphic.drawCircle(
        graphic.offset.x,
        graphic.offset.y,
        shape.radius * sizeMultiplier
      );
      break;
    case CONSTANTS.SHAPES.RECT:
      graphic.drawRect(
        graphic.offset.x,
        graphic.offset.y,
        shape.width * sizeMultiplier,
        shape.height * sizeMultiplier
      );
      break;
    case CONSTANTS.SHAPES.ELIP:
      graphic.drawEllipse(
        graphic.offset.x,
        graphic.offset.y,
        shape.width * sizeMultiplier,
        shape.height * sizeMultiplier
      );
      break;
    case CONSTANTS.SHAPES.RREC:
      graphic.drawRoundedRect(
        graphic.offset.x,
        graphic.offset.y,
        shape.width * sizeMultiplier,
        shape.height * sizeMultiplier,
        shape.radius * sizeMultiplier
      );
      break;
    case CONSTANTS.SHAPES.POLY:
      graphic.drawPolygon(
        shape.points.map((point) => {
          return new PIXI.Point(
            point[0] * sizeMultiplier + graphic.offset.x,
            point[1] * sizeMultiplier + graphic.offset.y
          );
        })
      );
      break;
  }

  graphic.alpha = shape.alpha ?? 1.0;

  graphic.endFill();

  return graphic;
}

export function calculate_missed_position(source, target, twister) {
  const sourcePosition = get_object_position(source);
  const sourceDimensions = get_object_dimensions(source, true);

  if (!target) {
    const angle = twister.random() * Math.PI * 2;
    let x = Math.cos(angle) * sourceDimensions.width;
    let y = Math.sin(angle) * sourceDimensions.height;

    return {
      x: lib.random_float_between(x * 1.5, x * 2.5, twister),
      y: lib.random_float_between(y * 1.5, y * 2.5, twister),
    };
  }

  const targetDimensions = get_object_dimensions(target, true);
  const targetPosition = get_object_position(target);

  const ray = new Ray(targetPosition, sourcePosition);

  let startRadians = ray.angle + Math.PI / 2;
  let endRadians = ray.angle - Math.PI / 2;

  const sizeCompensation = Math.max(
    1,
    Math.abs(sourceDimensions.width - targetDimensions.height)
  );
  let distance = ray.distance / canvas.grid.size - sizeCompensation;

  if (distance <= 1) {
    const angle =
      twister.random() > 0.5
        ? ray.angle + Math.PI / 4
        : ray.angle - Math.PI / 4;
    const x = Math.cos(angle) * targetDimensions.width;
    const y = Math.sin(angle) * targetDimensions.height;
    return { x, y };
  }

  distance = Math.max(Math.abs(distance - 15), 6);

  endRadians -= Math.PI / distance;
  startRadians += Math.PI / distance;

  const angle = lib.interpolate(startRadians, endRadians, twister.random());
  const x = Math.cos(angle) * targetDimensions.width;
  const y = Math.sin(angle) * targetDimensions.height;

  return {
    x: lib.random_float_between(x * 1.5, x * 2.5, twister),
    y: lib.random_float_between(y * 1.5, y * 2.5, twister),
  };
}

export function get_object_position(
  obj,
  { measure = false, exact = false } = {}
) {
  if (obj instanceof CanvasEffect) {
    return obj.worldPosition;
  }

  obj = obj?._object ?? obj.object ?? obj;

  let pos = {};
  if (obj instanceof MeasuredTemplate) {
    if (measure) {
      if (obj.document.t === "cone" || obj.document.t === "ray") {
        pos.x = obj.ray.B.x;
        pos.y = obj.ray.B.y;
      }
    }
    if (obj.document.t === "rect") {
      pos.x = obj.x;
      pos.y = obj.y;

      if (!exact) {
        pos.x += Math.abs(obj.shape.width / 2) + obj.shape.x;
        pos.y += Math.abs(obj.shape.height / 2) + obj.shape.y;
      }
    }
  } else if (obj instanceof Tile) {
    pos = {
      x: obj.document.x,
      y: obj.document.y,
    };

    if (!exact) {
      pos.x += Math.abs(obj.document.width / 2);
      pos.y += Math.abs(obj.document.height / 2);
    }
  } else if (obj instanceof Token) {
    const halfSize = get_object_dimensions(obj, true);
    pos = {
      x: obj.x + halfSize.width,
      y: obj.y + halfSize.height
    };

    if (exact) {
      pos.x -= halfSize.width;
      pos.y -= halfSize.height;
    }
  } else if (obj instanceof Drawing) {
    pos = {
      x: obj.document.x,
      y: obj.document.y,
    };

    if (!exact) {
      const halfSize = get_object_dimensions(obj, true);
      pos.x += halfSize.width;
      pos.y += halfSize.height;
    }
  }

  pos = {
    x:
      pos.x ??
      obj?.x ??
      obj?.position?.x ??
      obj?.position?._x ??
      obj?.document?.x ??
      obj?.document?.position?.x ??
      null,
    y:
      pos.y ??
      obj?.y ??
      obj?.position?.y ??
      obj?.position?._y ??
      obj?.document?.y ??
      obj?.document?.position?.y ??
      null,
    elevation: obj?.elevation ?? obj?.document?.elevation ?? null,
  };

  if (pos.x === null) delete pos["x"];
  if (pos.y === null) delete pos["y"];
  if (pos.elevation === null) delete pos["elevation"];

  return pos;
}

export function get_random_offset(target, randomOffset, twister = false) {
  let { width, height } = get_object_dimensions(target, true);

  width *= randomOffset;
  height *= randomOffset;

  return {
    x: lib.random_float_between(width * -1, width, twister),
    y: lib.random_float_between(height * -1, height, twister),
  };
}

export function get_object_dimensions(inObj, half = false) {
  inObj = inObj?.object ?? inObj?._object ?? inObj;

  let width =
    inObj?.hitArea?.width ??
    inObj?.w ??
    inObj?.shape?.width ??
    (inObj?.shape?.radius ? inObj?.shape?.radius * 2 : undefined) ??
    inObj?.width ??
    canvas.grid.size;

  let height =
    inObj?.hitArea?.height ??
    inObj?.h ??
    inObj?.shape?.height ??
    (inObj?.shape?.radius ? inObj?.shape?.radius * 2 : undefined) ??
    inObj?.height ??
    canvas.grid.size;

  return {
    width: width / (half ? 2 : 1),
    height: height / (half ? 2 : 1),
  };
}

export const alignments = {
  "top-left": { x: 0.5, y: 0.5 },
  top: { x: 0, y: 0.5 },
  "top-right": { x: -0.5, y: 0.5 },
  left: { x: 0.5, y: 0 },
  center: { x: 0, y: 0 },
  right: { x: -0.5, y: 0 },
  "bottom-left": { x: 0.5, y: -0.5 },
  bottom: { x: 0, y: -0.5 },
  "bottom-right": { x: -0.5, y: -0.5 },
};

export function align({
  context,
  spriteWidth,
  spriteHeight,
  align,
  edge,
} = {}) {
  let { width, height } = get_object_dimensions(context);

  const alignRatio = alignments[align];
  const offset = {
    x: lib.interpolate(width * -0.5, width * 0.5, alignRatio.x + 0.5),
    y: lib.interpolate(height * -0.5, height * 0.5, alignRatio.y + 0.5),
  };

  return {
    x:
      offset.x +
      (edge && edge !== "on"
        ? spriteWidth * alignRatio.x * (edge === "outer" ? 1 : -1)
        : 0),
    y:
      offset.y +
      (edge && edge !== "on"
        ? spriteHeight * alignRatio.y * (edge === "outer" ? 1 : -1)
        : 0),
  };
}

export function is_object_canvas_data(inObj) {
  if (typeof inObj !== "object") return false;
  const keys = Object.keys(inObj);
  keys.sort();
  return (
    (keys.includes("x") && keys.includes("y")) ||
    (keys.includes("height") &&
      keys.includes("width") &&
      keys.includes("x") &&
      keys.includes("y"))
  );
}

export function get_object_canvas_data(inObject, measure = false) {
  inObject = inObject?.object ?? inObject;
  return {
    ...get_object_position(inObject, { measure }),
    ...get_object_dimensions(inObject?.mesh ?? inObject?.tile ?? inObject),
    elevation: get_object_elevation(inObject),
    uuid: inObject?.document?.uuid ?? inObject?.uuid,
    cachedLocation: true,
  };
}

export function get_object_elevation(inObject) {
  return inObject?.document?.elevation ?? inObject?.elevation ?? 0;
}

export function get_mouse_position(snapToGrid = false, gridSnap = 2) {
  const pos = lib.getCanvasMouse().getLocalPosition(canvas.app.stage);
  return !snapToGrid
    ? new PIXI.Point(pos.x, pos.y)
    : canvas.grid.getSnappedPosition(pos.x, pos.y, gridSnap);
}

export function distance_between(p1, p2) {
  return new Ray(p1, p2).distance;
}

/**
 * Whether the current video is playing or not
 *
 * @returns {boolean}
 */
export function is_video_playing(video) {
  return (
    !!video &&
    video.currentTime >= 0 &&
    !video.paused &&
    video.currentTime <= video.duration
  );
}

/**
 * Determines whether a position is within the bounds of this effect
 *
 * @param inPosition
 * @param inElement
 * @param relativeTo
 * @returns {boolean}
 */
export function is_position_within_bounds(inPosition, inElement, relativeTo) {
  const localPosition = inElement.toLocal(inPosition, relativeTo);
  return inElement.getLocalBounds().contains(localPosition.x, localPosition.y);
}

export function rotate_coordinate(p1, p2, radians) {
  let cos = Math.cos(radians);
  let sin = Math.sin(radians);
  let nx = cos * (p2.x - p1.x) + sin * (p2.y - p1.y) + p1.x;
  let ny = cos * (p2.y - p1.y) - sin * (p2.x - p1.x) + p1.y;
  return [nx, ny];
}

/**
 * Gets the closest token to a certain position
 *
 * @param inPosition
 * @param minimumDistance
 * @returns {*|boolean}
 */
export function get_closest_token(
  inPosition,
  { minimumDistance = false } = {}
) {
  let tokens = Array.from(canvas.scene.tokens);
  if (minimumDistance) {
    tokens = tokens.filter(
      (token) =>
        distance_between(get_object_position(token), inPosition) <=
        minimumDistance
    );
  }
  tokens.sort((a, b) => {
    return (
      distance_between(get_object_position(a), inPosition) -
      distance_between(get_object_position(b), inPosition)
    );
  });
  return tokens?.[0] ?? false;
}

export function getBezierControlPoints(factor, previous, point, next) {
  // Calculate distance vectors
  let vector = { x: next[0] - previous[0], y: next[1] - previous[1] },
    preDistance = Math.hypot(previous[0] - point[0], previous[1] - point[1]),
    postDistance = Math.hypot(next[0] - point[0], next[1] - point[1]),
    distance = preDistance + postDistance;

  // Compute control point locations
  let cp0d = distance === 0 ? 0 : factor * (preDistance / distance),
    cp1d = distance === 0 ? 0 : factor * (postDistance / distance);

  // Return points
  return {
    cp1: {
      x: point[0] - vector.x * cp0d,
      y: point[1] - vector.y * cp0d,
    },
    next_cp0: {
      x: point[0] + vector.x * cp1d,
      y: point[1] + vector.y * cp1d,
    },
  };
}

export function rotateAroundPoint(cx, cy, x, y, angle) {
  let radians = (Math.PI / 180) * angle,
    cos = Math.cos(radians),
    sin = Math.sin(radians),
    nx = cos * (x - cx) + sin * (y - cy) + cx,
    ny = cos * (y - cy) - sin * (x - cx) + cy;
  return { x: nx, y: ny };
}

export function validateAnimation(inTarget, inPropertyName, inOptions) {
  if (typeof inPropertyName !== "string") {
    return `inPropertyName must be of type string`;
  }
  if (typeof inTarget !== "string") {
    return `inTarget must be of type string`;
  }
  if (!lib.is_real_number(inOptions.from)) {
    return `inOptions.from must be of type number`;
  }
  if (!lib.is_real_number(inOptions.to)) {
    return `inOptions.to must be of type number`;
  }
  if (!lib.is_real_number(inOptions.duration)) {
    return `inOptions.duration must be of type number`;
  }
  if (inOptions?.delay !== undefined && !lib.is_real_number(inOptions.delay)) {
    return `inOptions.delay must be of type number`;
  }
  if (inOptions?.ease !== undefined && typeof inOptions.ease !== "string") {
    return `inOptions.ease must be of type string`;
  }
  if (
    inOptions?.fromEnd !== undefined &&
    typeof inOptions.fromEnd !== "boolean"
  ) {
    return `inOptions.fromEnd must be of type boolean`;
  }
  if (inOptions?.gridUnits !== undefined) {
    if (typeof inOptions.gridUnits !== "boolean") {
      return `inOptions.gridUnits must be of type boolean`;
    }
    if (
      inOptions.gridUnits &&
      ![
        "position.x",
        "position.y",
        "scale.x",
        "scale.y",
        "height",
        "width",
      ].includes(inPropertyName)
    ) {
      return `if inOptions.gridUnits is true, inPropertyName must be position.x, position.y, scale.x, scale.y, width, or height`;
    }
  }

  return {
    target: inTarget,
    propertyName: inPropertyName,
    from: inOptions?.from,
    to: inOptions?.to,
    duration: inOptions?.duration ?? 0,
    delay: inOptions?.delay ?? 0,
    ease: inOptions?.ease ?? "linear",
    looping: false,
    fromEnd: inOptions?.fromEnd ?? false,
    gridUnits: inOptions?.gridUnits ?? false,
  };
}

export function validateLoopingAnimation(inTarget, inPropertyName, inOptions) {
  if (typeof inPropertyName !== "string") {
    return `inPropertyName must be of type string`;
  }
  if (typeof inTarget !== "string") {
    return `inTarget must be of type string`;
  }

  if (!inOptions?.values) {
    if (!inOptions?.from === undefined || !inOptions?.to === undefined) {
      return `if inOptions.values is not set, you must provide inOptions.from and inOptions.to`;
    }
    if (!lib.is_real_number(inOptions.from)) {
      return `inOptions.from must be of type number`;
    }
    if (!lib.is_real_number(inOptions.to)) {
      return `inOptions.to must be of type number`;
    }
    inOptions.values = [inOptions?.from, inOptions?.to];
    delete inOptions.from;
    delete inOptions.to;
  } else {
    if (!Array.isArray(inOptions.values)) {
      return `inOptions.values must be of type array`;
    }
    inOptions.values.forEach((value) => {
      if (!lib.is_real_number(value)) {
        return `values in inOptions.keys must be of type number`;
      }
    });
  }

  if (!lib.is_real_number(inOptions.duration)) {
    return `inOptions.duration must be of type number`;
  }

  if (inOptions?.delay !== undefined && !lib.is_real_number(inOptions.delay)) {
    return `inOptions.delay must be of type number`;
  }
  if (inOptions?.ease !== undefined && typeof inOptions.ease !== "string") {
    return `inOptions.ease must be of type string`;
  }
  if (inOptions?.loops !== undefined && !lib.is_real_number(inOptions.loops)) {
    return `inOptions.loops must be of type number`;
  }
  if (
    inOptions?.pingPong !== undefined &&
    typeof inOptions.pingPong !== "boolean"
  ) {
    return `inOptions.pingPong must be of type boolean`;
  }
  if (inOptions?.gridUnits !== undefined) {
    if (typeof inOptions.gridUnits !== "boolean") {
      return `inOptions.gridUnits must be of type boolean`;
    }
    if (
      inOptions.gridUnits &&
      ![
        "position.x",
        "position.y",
        "scale.x",
        "scale.y",
        "height",
        "width",
      ].includes(inPropertyName)
    ) {
      return `if inOptions.gridUnits is true, inPropertyName must be position.x, position.y, scale.x, scale.y, width, or height`;
    }
  }

  return {
    target: inTarget,
    propertyName: inPropertyName,
    values: inOptions?.values,
    duration: inOptions?.duration ?? 0,
    delay: inOptions?.delay ?? 0,
    ease: inOptions?.ease ?? "linear",
    looping: true,
    loops: inOptions?.loops,
    indefinite:
      inOptions?.loops === undefined || !lib.is_real_number(inOptions?.loops),
    pingPong: inOptions?.pingPong ?? false,
    gridUnits: inOptions?.gridUnits ?? false,
  };
}
