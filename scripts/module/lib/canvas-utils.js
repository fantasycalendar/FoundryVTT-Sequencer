import * as lib from "./lib.js";
import CanvasEffect from "../canvas-effects/canvas-effect.js";

export function calculate_missed_position(source, target, twister) {

    const sourcePosition = get_object_position(source);

    if(!target){

        const sourceDimensions = get_object_dimensions(source, true);

        const angle = twister.random() * Math.PI * 2;
        let x = Math.cos(angle) * sourceDimensions.width;
        let y = Math.sin(angle) * sourceDimensions.height;

        return {
            x: lib.random_float_between(x*1.5, x*2.5, twister),
            y: lib.random_float_between(y*1.5, y*2.5, twister),
        };

    }

    const targetDimensions = get_object_dimensions(target, true);
    const targetPosition = get_object_position(target);

    const ray = new Ray(targetPosition, sourcePosition);

    let startRadians = ray.angle + (Math.PI / 2);
    let endRadians = ray.angle - (Math.PI / 2);

    let distance = (ray.distance / canvas.grid.size) - 1;

    let angle;

    if(distance < 1) {

        angle = twister.random() > 0.5 ? startRadians : endRadians;

    }else {

        distance = Math.max(Math.abs(distance - 15), 6);

        endRadians -= (Math.PI / distance);
        startRadians += (Math.PI / distance);

        angle = lib.interpolate(startRadians, endRadians, twister.random());

    }

    let x = Math.cos(angle) * targetDimensions.width;
    let y = Math.sin(angle) * targetDimensions.height;

    return {
        x: lib.random_float_between(x*1.5, x*2.5, twister),
        y: lib.random_float_between(y*1.5, y*2.5, twister),
    }

}

export function get_object_position(obj, measure = false) {

    obj = obj?._object ?? obj;

    if(obj instanceof CanvasEffect){
        const t = canvas.stage.worldTransform;
        return {
            x: (obj.sprite.worldTransform.tx - t.tx)/ canvas.stage.scale.x,
            y: (obj.sprite.worldTransform.ty - t.ty)/ canvas.stage.scale.y
        }
    }

    let pos = {};
    if (obj instanceof MeasuredTemplate) {
        if (measure) {
            if (obj.data.t === "cone" || obj.data.t === "ray") {
                pos.x = obj.ray.B.x;
                pos.y = obj.ray.B.y;
            }
        }
        if (obj.data.t === "rect") {
            pos.x = obj.x + (obj.shape.width / 2)
            pos.y = obj.y + (obj.shape.height / 2)
        }
    } else if (obj instanceof Tile || obj instanceof TileDocument) {
        pos = {
            x: obj.data.x + (obj.data.width / 2),
            y: obj.data.y + (obj.data.height / 2)
        }
    } else {
        pos = {
            x: obj?.x ?? obj?.position?.x ?? obj?.position?._x ?? obj?.data?.x ?? obj?.data?.position?.x ?? 0,
            y: obj?.y ?? obj?.position?.y ?? obj?.position?._y ?? obj?.data?.y ?? obj?.data?.position?.y ?? 0
        }

        if (obj instanceof Token) {
            const halfSize = get_object_dimensions(obj, true);
            pos.x += halfSize.width;
            pos.y += halfSize.height;
        }
    }

    pos = {
        x: pos?.x ?? obj?.x ?? obj?.data?.x,
        y: pos?.y ?? obj?.y ?? obj?.data?.y,
    };

    if (!lib.is_real_number(pos.x) || !lib.is_real_number(pos.y)){
        return false;
    }

    return pos;

}

export function get_random_offset(target, randomOffset, twister = false) {

    let { width, height } = get_object_dimensions(target, true);

    width *= randomOffset;
    height *= randomOffset;

    return {
        x: lib.random_float_between(width * -1,  width, twister),
        y: lib.random_float_between(height * -1, height, twister)
    };

}

export function get_object_dimensions(inObj, half = false){

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


export function get_hash(input){
    let hash = 0
    const len = input.length;
    for (let i = 0; i < len; i++) {
        hash  = ((hash << 5) - hash) + input.charCodeAt(i);
        hash |= 0; // to 32bit integer
    }
    return hash;
}


export function align({context, spriteWidth, spriteHeight, align}={}){

    let { width, height } = get_object_dimensions(context);

    let widthRatio = (width - (spriteWidth * 0.5)) / width;
    let heightRatio = (height - (spriteHeight * 0.5)) / height;

    const alignRatio = {
        "top-left":     { x: widthRatio,    y: heightRatio },
        "top":          { x: 0.5,           y: heightRatio },
        "top-right":    { x: 1-widthRatio,  y: heightRatio },
        "left":         { x: widthRatio,    y: 0.5 },
        "center":       { x: 0.5,           y: 0.5 },
        "right":        { x: 1-widthRatio,  y: 0.5 },
        "bottom-left":  { x: widthRatio,    y: 1-heightRatio },
        "bottom":       { x: 0.5,           y: 1-heightRatio },
        "bottom-right": { x: 1-widthRatio,  y: 1-heightRatio }
    }[align];

    return {
        x: lib.interpolate(width*-0.5,width*0.5, alignRatio.x),
        y: lib.interpolate(height*-0.5,height*0.5, alignRatio.y)
    }

}

export function is_object_canvas_data(inObj) {
    if(typeof inObj !== "object") return false;
    const keys = Object.keys(inObj);
    keys.sort();
    return (keys.length === 2 && keys[0] === "x" && keys[1] === "y")
        || (keys.length === 4 && keys[0] === "height" && keys[1] === "width" && keys[2] === "x" && keys[3] === "y")
}

export function get_object_canvas_data(inObject, measure = false){
    return {
        ...get_object_position(inObject, measure),
        ...get_object_dimensions(inObject)
    }
}