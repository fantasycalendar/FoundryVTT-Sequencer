import * as lib from "./lib.js";
import CanvasEffect from "../canvas-effects/canvas-effect.js";

export function calculate_missed_position(source, target, twister) {

    const sourcePosition = get_object_position(source);

    if (!target) {

        const sourceDimensions = get_object_dimensions(source, true);

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

    let startRadians = ray.angle + (Math.PI / 2);
    let endRadians = ray.angle - (Math.PI / 2);

    let distance = (ray.distance / canvas.grid.size) - 1;

    let angle;

    if (distance < 1) {

        angle = twister.random() > 0.5 ? startRadians : endRadians;

    } else {

        distance = Math.max(Math.abs(distance - 15), 6);

        endRadians -= (Math.PI / distance);
        startRadians += (Math.PI / distance);

        angle = lib.interpolate(startRadians, endRadians, twister.random());

    }

    let x = Math.cos(angle) * targetDimensions.width;
    let y = Math.sin(angle) * targetDimensions.height;

    return {
        x: lib.random_float_between(x * 1.5, x * 2.5, twister),
        y: lib.random_float_between(y * 1.5, y * 2.5, twister),
    }

}

export function get_object_position(obj, { measure = false, exact = false }={}) {

    if(obj instanceof CanvasEffect){
        return obj.worldPosition;
    }

    obj = obj?._object ?? obj;

    let pos = {};
    if (obj instanceof MeasuredTemplate || obj instanceof MeasuredTemplateDocument) {
        obj = obj instanceof MeasuredTemplateDocument ? obj.object : obj;
        if (measure) {
            if (obj.data.t === "cone" || obj.data.t === "ray") {
                pos.x = obj.ray.B.x;
                pos.y = obj.ray.B.y;
            }
        }
        if (obj.data.t === "rect") {
            pos.x = obj.x
            pos.y = obj.y

            if(!exact){
                pos.x += Math.abs(obj.shape.width / 2) + (obj.shape.x)
                pos.y += Math.abs(obj.shape.height / 2) + (obj.shape.y)
            }
        }
    } else if (obj instanceof Tile || obj instanceof TileDocument) {
        obj = obj instanceof TileDocument ? obj.object : obj;
        pos = {
            x: obj.data.x,
            y: obj.data.y
        }

        if(!exact){
            pos.x += Math.abs(obj.data.width / 2)
            pos.y += Math.abs(obj.data.height / 2)
        }
    } else {
        pos = {
            x: obj?.x ?? obj?.position?.x ?? obj?.position?._x ?? obj?.data?.x ?? obj?.data?.position?.x ?? 0,
            y: obj?.y ?? obj?.position?.y ?? obj?.position?._y ?? obj?.data?.y ?? obj?.data?.position?.y ?? 0
        }

        if (obj instanceof Token && !exact) {
            const halfSize = get_object_dimensions(obj, true);
            pos.x += halfSize.width;
            pos.y += halfSize.height;
        }
    }

    pos = {
        x: pos?.x ?? obj?.x ?? obj?.data?.x,
        y: pos?.y ?? obj?.y ?? obj?.data?.y,
    };

    if (!lib.is_real_number(pos.x) || !lib.is_real_number(pos.y)) {
        return false;
    }

    return pos;

}

export function get_random_offset(target, randomOffset, twister = false) {

    let { width, height } = get_object_dimensions(target, true);

    width *= randomOffset;
    height *= randomOffset;

    return {
        x: lib.random_float_between(width * -1, width, twister),
        y: lib.random_float_between(height * -1, height, twister)
    };

}

export function get_object_dimensions(inObj, half = false) {

    inObj = inObj?.object ?? inObj;

    const width = inObj?.hitArea?.width
        ?? inObj?.w
        ?? inObj?.shape?.width
        ?? (inObj?.shape?.radius ? inObj?.shape?.radius * 2 : undefined)
        ?? inObj?.width
        ?? canvas.grid.size;

    const height = inObj?.hitArea?.height
        ?? inObj?.h
        ?? inObj?.shape?.height
        ?? (inObj?.shape?.radius ? inObj?.shape?.radius * 2 : undefined)
        ?? inObj?.height
        ?? canvas.grid.size;

    return {
        width: width / (half ? 2 : 1),
        height: height / (half ? 2 : 1)
    }
}

export const alignments = {
    "top-left":          { x: 0.5,  y: 0.5  },
    "top":               { x: 0,    y: 0.5  },
    "top-right":         { x: -0.5, y: 0.5  },
    "left":              { x: 0.5,  y: 0    },
    "center":            { x: 0,    y: 0    },
    "right":             { x: -0.5, y: 0    },
    "bottom-left":       { x: 0.5,  y: -0.5 },
    "bottom":            { x: 0,    y: -0.5 },
    "bottom-right":      { x: -0.5, y: -0.5 }
};

export function align({ context, spriteWidth, spriteHeight, align, edge } = {}) {

    let { width, height } = get_object_dimensions(context);

    const alignRatio = alignments[align];
    const offset = {
        x: lib.interpolate(width*-0.5, width*0.5, alignRatio.x+0.5),
        y: lib.interpolate(height*-0.5, height*0.5, alignRatio.y+0.5)
    };

    return {
        x: offset.x + (edge && edge !== "on" ? (spriteWidth * alignRatio.x * (edge === "outer" ? 1 : -1)) : 0),
        y: offset.y + (edge && edge !== "on" ? (spriteHeight * alignRatio.y * (edge === "outer" ? 1 : -1)) : 0)
    }

}

export function is_object_canvas_data(inObj) {
    if (typeof inObj !== "object") return false;
    const keys = Object.keys(inObj);
    keys.sort();
    return (keys.includes("x") && keys.includes("y"))
        || (keys.includes("height") && keys.includes("width") && keys.includes("x") && keys.includes("y"))
}

export function get_object_canvas_data(inObject, measure = false) {
    inObject = inObject?.object ?? inObject;
    return {
        ...get_object_position(inObject, { measure }),
        ...get_object_dimensions(inObject?.icon ?? inObject?.tile ?? inObject)
    }
}

export function get_mouse_position(snapToGrid = false, gridSnap = 2) {
    const pos = canvas.app.renderer.plugins.interaction.mouse.getLocalPosition(canvas.app.stage);
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
    return (!!video && video.currentTime >= 0 && !video.paused && video.currentTime <= video.duration);
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
    let nx = (cos * (p2.x - p1.x)) + (sin * (p2.y - p1.y)) + p1.x;
    let ny = (cos * (p2.y - p1.y)) - (sin * (p2.x - p1.x)) + p1.y;
    return [nx, ny];
}

/**
 * Gets the closest token to a certain position
 *
 * @param inPosition
 * @param minimumDistance
 * @returns {*|boolean}
 */
export function get_closest_token(inPosition, { minimumDistance = false } = {}) {
    let tokens = Array.from(canvas.scene.tokens);
    if (minimumDistance) {
        tokens = tokens.filter(token => distance_between(get_object_position(token), inPosition) <= minimumDistance)
    }
    tokens.sort((a, b) => {
        return distance_between(get_object_position(a), inPosition) - distance_between(get_object_position(b), inPosition)
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
            x: point[0] - (vector.x * cp0d),
            y: point[1] - (vector.y * cp0d)
        },
        next_cp0: {
            x: point[0] + (vector.x * cp1d),
            y: point[1] + (vector.y * cp1d)
        }
    }
}