import * as lib from "./lib.js";
import CanvasEffect from "../canvas-effects/canvas-effect.js";
import CONSTANTS from "../constants.js";
import { sequencerSocket, SOCKET_HANDLERS } from "../sockets.js";

export function createShape(shape) {
  const graphic = new PIXI.LegacyGraphics();

	graphic.id = "sequencer-graphics-" + foundry.utils.randomID();

	graphic.beginFill(
		shape?.isMask || !lib.is_real_number(shape?.fillColor) ? 0xffffff : shape?.fillColor,
		shape?.isMask ? 1 : (shape?.fillAlpha ?? 0)
	);

  graphic.lineStyle(
    shape.lineSize ?? (shape?.isMask ? 1 : 0),
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
            point[0] * sizeMultiplier,
            point[1] * sizeMultiplier
          );
        })
      );
      break;
  }

  graphic.alpha = shape.alpha ?? 1.0;

  graphic.endFill();

	if (shape.anchor) {
		graphic.pivot.set(
			shape.width * (shape.anchor.x ?? 0.0),
			shape.height * (shape.anchor.y ?? 0.0)
		)
	}

  return graphic;
}

/**
 * Serialize a raw PIXI shape into a plain-object envelope that survives JSON cloning.
 *
 * @param {PIXI.Polygon|PIXI.Circle|PIXI.Rectangle} shape
 * @returns {{type: string, [key: string]: any}}
 */
export function serializeShape(shape) {
	if (shape instanceof PIXI.Polygon) {
		return { type: "Polygon", points: Array.from(shape.points) };
	}
	if (shape instanceof PIXI.Circle) {
		return { type: "Circle", x: shape.x, y: shape.y, radius: shape.radius };
	}
	if (shape instanceof PIXI.Rectangle) {
		return { type: "Rectangle", x: shape.x, y: shape.y, width: shape.width, height: shape.height };
	}
	throw new Error("serializeShape: unsupported shape type");
}

/**
 * Rebuild a PIXI shape from a serialized envelope produced by `serializeShape`.
 *
 * @param {{type: string, [key: string]: any}} data
 * @returns {PIXI.Polygon|PIXI.Circle|PIXI.Rectangle|null}
 */
export function deserializeShape(data) {
	if (!data || typeof data !== "object") return null;
	switch (data.type) {
		case "Polygon":
			return new PIXI.Polygon(data.points ?? []);
		case "Circle":
			return new PIXI.Circle(data.x ?? 0, data.y ?? 0, data.radius ?? 0);
		case "Rectangle":
			return new PIXI.Rectangle(data.x ?? 0, data.y ?? 0, data.width ?? 0, data.height ?? 0);
	}
	return null;
}

/**
 * Computes a wall-constrained polygon sweep from an origin point, using Foundry's
 * native ClockwiseSweepPolygon. Useful for masking effects to line of sight, sound,
 * or movement reachability, independent of any third-party module.
 *
 * @param {{x: number, y: number, elevation?: number}} origin
 * @param {object} [options]
 * @param {"sight"|"sound"|"move"|"light"} [options.type="sight"]   Collision type
 * @param {number|null} [options.radius=null]                       Bounding circle radius in pixels
 * @param {foundry.documents.Level|string|null} [options.level=null]
 *        On Foundry v14+, the scene Level whose edge set the sweep should consult. Accepts
 *        a Level document or its id (resolved against the current scene). When omitted,
 *        Foundry defaults to `canvas.level`, the currently viewed level, which is wrong for
 *        sources on a different floor than the viewer. Ignored on Foundry v13.
 * @returns {PIXI.Polygon|null}
 */
export function computeWallPolygon(origin, options = {}) {
	if (!origin || typeof origin.x !== "number" || typeof origin.y !== "number") {
		throw new Error("computeWallPolygon: origin must be { x: number, y: number }");
	}
	const {
		type = "sight",
		radius = null,
		level = null,
	} = options;

	const validTypes = ["sight", "sound", "move", "light"];
	if (!validTypes.includes(type)) {
		throw new Error(`computeWallPolygon: type must be one of ${validTypes.join(", ")}`);
	}

	const config = { type };

	if (typeof radius === "number") {
		config.radius = radius;
	}

	if (level) {
		let resolved = level;
		if (typeof level === "string") {
			const sceneLevels = canvas.scene?.levels;
			resolved = sceneLevels?.get(level) ?? sceneLevels?.getName?.(level) ?? null;
		}
		if (resolved) config.level = resolved;
	}

	const PolygonBackend = CONFIG.Canvas.polygonBackends[type];
	if (!PolygonBackend) {
		throw new Error(`computeWallPolygon: no polygon backend registered for type "${type}"`);
	}

	return PolygonBackend.create(
		{ x: origin.x, y: origin.y, elevation: origin.elevation ?? 0 },
		config
	);
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

  const ray = new foundry.canvas.geometry.Ray(targetPosition, sourcePosition);

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
	if (obj instanceof foundry.canvas.placeables.Region){
		if(obj.document.shapes.length > 1){
			pos.x = obj.bounds.x + obj.bounds.width/2;
			pos.y = obj.bounds.y + obj.bounds.height/2;
		}else{
			let firstShape = obj.document.shapes[0];
			switch(firstShape.type){
				case "cone":
				case "line":
					if (!measure) {
						pos.x = firstShape.measuredSegments[0].ray.A.x;
						pos.y = firstShape.measuredSegments[0].ray.A.y;
					} else {
						pos.x = firstShape.measuredSegments[0].ray.B.x;
						pos.y = firstShape.measuredSegments[0].ray.B.y;
					}
					break;
				default:
					pos.x = firstShape.center.x;
					pos.y = firstShape.center.y;
			}
		}
	} else if (obj instanceof foundry.canvas.placeables.MeasuredTemplate) {
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
	} else if (obj instanceof foundry.canvas.placeables.Tile) {
    pos = {
      x: obj.document.x,
      y: obj.document.y,
    };

    if (!exact) {
      pos.x += Math.abs(obj.document.width / 2);
      pos.y += Math.abs(obj.document.height / 2);
    }
  } else if (obj instanceof foundry.canvas.placeables.Token) {
    const halfSize = get_object_dimensions(obj, true);
    pos = {
      x: obj.x + halfSize.width,
      y: obj.y + halfSize.height,
    };

    if (exact) {
      pos.x -= halfSize.width;
      pos.y -= halfSize.height;
    }
  } else if (obj instanceof foundry.canvas.placeables.Drawing) {
    pos = {
      x: obj.document.x,
      y: obj.document.y,
    };

    if (!exact) {
      const halfSize = get_object_dimensions(obj, true);
      pos.x += halfSize.width;
      pos.y += halfSize.height;
    }
  } else {
    // When the placeable isn't on this canvas (off-level region, etc.),
    // read position from the document directly.
    const docBounds = compute_document_bounds(obj, { measure });
    if (docBounds) {
      if (exact) {
        pos.x = docBounds.x;
        pos.y = docBounds.y;
      } else {
        pos.x = docBounds.x + docBounds.width / 2;
        pos.y = docBounds.y + docBounds.height / 2;
      }
      // Region line and cone shapes return endpoint A or B based on the
      // measure flag, matching the placeable branch so .stretchTo() can
      // stretch across them.
      const directional = compute_region_directional_endpoint(obj, { measure });
      if (directional) {
        pos.x = directional.x;
        pos.y = directional.y;
      }
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
    elevation:
      (obj?.elevation ?? obj?.document?.elevation) != null
        ? get_object_elevation(obj)
        : null,
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

	if (inObj instanceof foundry.canvas.placeables.Region){
		if(inObj.document.shapes.length > 1){
			return {
				width: inObj.bounds.width / (half ? 2 : 1),
				height: inObj.bounds.height / (half ? 2 : 1)
			}
		}else{
			let firstShape = inObj.document.shapes[0];
			switch(firstShape.type){
				case "cone":
				case "circle":
					return {
						width: firstShape.radius / (half ? 1 : 0.5),
						height: firstShape.radius / (half ? 1 : 0.5)
					}
				case "ring":
					return {
						width: ((firstShape.radius + firstShape.outerWidth) - (firstShape.innerWidth / 2)) / (half ? 1 : 0.5),
						height: ((firstShape.radius + firstShape.outerWidth) - (firstShape.innerWidth / 2)) / (half ? 1 : 0.5)
					}
				default:
					return {
						width: firstShape.width / (half ? 2 : 1),
						height: firstShape.height / (half ? 2 : 1)
					}
			}
		}
	}else if(inObj instanceof foundry.canvas.placeables.Tile){
		return {
			width: inObj.document.width / (half ? 2 : 1),
			height: inObj.document.height / (half ? 2 : 1)
		}
	}

  // When the placeable isn't on this canvas (off-level region, etc.),
  // read dimensions from the document directly.
  const docBounds = compute_document_bounds(inObj);
  if (docBounds) {
    return {
      width: docBounds.width / (half ? 2 : 1),
      height: docBounds.height / (half ? 2 : 1),
    };
  }

  let width =
    inObj?.hitArea?.width ??
    inObj?.w ??
    inObj?.shape?.width ??
    (inObj?.shape?.radius ? inObj?.shape?.radius * 2 : undefined) ??
    inObj?.bounds?.width ??
    inObj?.width ??
    canvas.grid.size;

  let height =
    inObj?.hitArea?.height ??
    inObj?.h ??
    inObj?.shape?.height ??
    (inObj?.shape?.radius ? inObj?.shape?.radius * 2 : undefined) ??
    inObj?.bounds?.height ??
    inObj?.height ??
    canvas.grid.size;

  return {
    width: width / (half ? 2 : 1),
    height: height / (half ? 2 : 1),
  };
}

// Document/shape type warnings are deduped so a per-frame caller can't
// flood the debug log when a Foundry schema field drifts.
const _warnedUnknownTypes = new Set();
function _warnUnknownType(category, type) {
	const key = category + ":" + type;
	if (_warnedUnknownTypes.has(key)) return;
	_warnedUnknownTypes.add(key);
	lib.debug(`Sequencer | unhandled ${category} type "${type}"`);
}

/**
 * Bounding box (canvas pixels) for a CanvasDocument from schema fields.
 * Returns null when the input isn't a recognized document.
 *
 * @param {foundry.abstract.Document|null|undefined} doc
 * @param {{measure?: boolean}} [options]
 * @returns {{x: number, y: number, width: number, height: number}|null}
 */
function compute_document_bounds(doc, { measure = false } = {}) {
  if (!doc || typeof doc !== "object") return null;
  const docName = doc.documentName;
  if (!docName) return null;

  const scene = doc.parent ?? canvas?.scene;
  const gridSize = scene?.grid?.size ?? canvas?.grid?.size ?? 100;
  const gridDistance = scene?.grid?.distance ?? canvas?.grid?.distance ?? 5;
  const distancePixels = scene?.dimensions?.distancePixels ?? (gridSize / gridDistance);

  switch (docName) {
    case "Token": {
      // doc.width / doc.height are in grid units.
      const w = (doc.width ?? 1) * gridSize;
      const h = (doc.height ?? 1) * gridSize;
      return { x: doc.x ?? 0, y: doc.y ?? 0, width: w, height: h };
    }

    case "Tile": {
      return {
        x: doc.x ?? 0,
        y: doc.y ?? 0,
        width: doc.width ?? 0,
        height: doc.height ?? 0,
      };
    }

    case "Drawing": {
      const shape = doc.shape ?? {};
      const baseX = doc.x ?? 0;
      const baseY = doc.y ?? 0;
      switch (shape.type) {
        case "r": // rectangle
        case "e": // ellipse
          return { x: baseX, y: baseY, width: shape.width ?? 0, height: shape.height ?? 0 };
        case "c": { // circle
          const r = shape.radius ?? 0;
          return { x: baseX, y: baseY, width: r * 2, height: r * 2 };
        }
        case "p": // polygon
        case "f": { // freehand
          const pts = shape.points;
          if (!pts?.length) return { x: baseX, y: baseY, width: 0, height: 0 };
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (let i = 0; i < pts.length; i += 2) {
            const px = pts[i], py = pts[i + 1];
            if (px < minX) minX = px;
            if (py < minY) minY = py;
            if (px > maxX) maxX = px;
            if (py > maxY) maxY = py;
          }
          return { x: baseX + minX, y: baseY + minY, width: maxX - minX, height: maxY - minY };
        }
        default:
          _warnUnknownType("drawing shape", shape.type);
          return { x: baseX, y: baseY, width: shape.width ?? 0, height: shape.height ?? 0 };
      }
    }

    case "Region": {
      // Union the bounding boxes of every shape on the region.
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      let any = false;
      for (const shape of doc.shapes ?? []) {
        const sb = compute_region_shape_bounds(shape);
        if (!sb) continue;
        any = true;
        if (sb.x < minX) minX = sb.x;
        if (sb.y < minY) minY = sb.y;
        if (sb.x + sb.width > maxX) maxX = sb.x + sb.width;
        if (sb.y + sb.height > maxY) maxY = sb.y + sb.height;
      }
	    if (!any) return null;
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }

    case "MeasuredTemplate": {
      const baseX = doc.x ?? 0;
      const baseY = doc.y ?? 0;
      const distance = doc.distance ?? 0;
      const r = distance * distancePixels;
      switch (doc.t) {
        case "circle":
        case "cone":
          return { x: baseX - r, y: baseY - r, width: r * 2, height: r * 2 };
        case "rect":
          return { x: baseX, y: baseY, width: r, height: r };
        case "ray": {
          const w = (doc.width ?? 1) * distancePixels;
          return { x: baseX, y: baseY - w / 2, width: r, height: w };
        }
        default:
          return { x: baseX - r, y: baseY - r, width: r * 2, height: r * 2 };
      }
    }

    case "AmbientLight": {
      const radius = Math.max(doc.config?.dim ?? 0, doc.config?.bright ?? 0) * distancePixels;
      if (radius > 0) {
        return { x: (doc.x ?? 0) - radius, y: (doc.y ?? 0) - radius, width: radius * 2, height: radius * 2 };
      }
      return { x: doc.x ?? 0, y: doc.y ?? 0, width: gridSize, height: gridSize };
    }

    case "AmbientSound": {
      const radius = (doc.radius ?? 0) * distancePixels;
      if (radius > 0) {
        return { x: (doc.x ?? 0) - radius, y: (doc.y ?? 0) - radius, width: radius * 2, height: radius * 2 };
      }
      return { x: doc.x ?? 0, y: doc.y ?? 0, width: gridSize, height: gridSize };
    }

    case "Wall": {
      const c = doc.c ?? [0, 0, 0, 0];
      const [x1, y1, x2, y2] = c;
      return {
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        width: Math.abs(x2 - x1),
        height: Math.abs(y2 - y1),
      };
    }

    case "Note": {
      const s = doc.iconSize ?? gridSize;
      return { x: (doc.x ?? 0) - s / 2, y: (doc.y ?? 0) - s / 2, width: s, height: s };
    }

    default:
      _warnUnknownType("document", docName);
      return null;
  }
}

/**
 * Build a PIXI mask shape from a DrawingDocument's schema fields. Local
 * coordinates; the caller positions the resulting graphics.
 *
 * @param {foundry.abstract.Document|null|undefined} doc
 * @returns {PIXI.Rectangle|PIXI.Ellipse|PIXI.Circle|PIXI.Polygon|null}
 */
export function create_drawing_mask_shape(doc) {
  const shape = doc?.shape;
  if (!shape) return null;
  switch (shape.type) {
    case "r":
      return new PIXI.Rectangle(0, 0, shape.width ?? 0, shape.height ?? 0);
    case "e": {
      const w = shape.width ?? 0;
      const h = shape.height ?? 0;
      return new PIXI.Ellipse(w / 2, h / 2, w / 2, h / 2);
    }
    case "c": {
      const r = shape.radius ?? 0;
      return new PIXI.Circle(r, r, r);
    }
    case "p":
    case "f": {
      const pts = shape.points;
      if (!pts?.length) return null;
      return new PIXI.Polygon(pts.slice());
    }
    default:
      _warnUnknownType("drawing shape", shape.type);
      return null;
  }
}

/**
 * For single-shape Regions with a directional shape (line, cone), returns
 * endpoint A at `!measure` and endpoint B at `measure`. Null otherwise.
 *
 * @param {foundry.abstract.Document|null|undefined} doc
 * @param {{measure?: boolean}} [options]
 * @returns {{x: number, y: number}|null}
 */
function compute_region_directional_endpoint(doc, { measure = false } = {}) {
  if (doc?.documentName !== "Region") return null;
  const shapes = doc.shapes;
  if (!shapes || shapes.length !== 1) return null;
  const shape = shapes[0];
  if (shape?.type !== "line" && shape?.type !== "cone") return null;

  const ox = shape.x ?? 0;
  const oy = shape.y ?? 0;
  if (!measure) return { x: ox, y: oy };

  const extent = shape.type === "line" ? (shape.length ?? 0) : (shape.radius ?? 0);
  const rot = ((shape.rotation ?? 0) * Math.PI) / 180;
  return {
    x: ox + (extent * Math.cos(rot)),
    y: oy + (extent * Math.sin(rot)),
  };
}

/**
 * Axis-aligned bounding box (canvas pixels) for any v14 BaseShapeData
 * on a RegionDocument. Rotation is over-approximated, not rotated exactly.
 *
 * @param {object} shape
 * @returns {{x: number, y: number, width: number, height: number}|null}
 */
function compute_region_shape_bounds(shape) {
  if (!shape) return null;

  switch (shape.type) {

    case "rectangle": {
      // x, y is top-left.
      return {
        x: shape.x ?? 0,
        y: shape.y ?? 0,
        width: shape.width ?? 0,
        height: shape.height ?? 0,
      };
    }

    case "circle": {
      // x, y is center.
      const r = shape.radius ?? 0;
      return {
        x: (shape.x ?? 0) - r,
        y: (shape.y ?? 0) - r,
        width: r * 2,
        height: r * 2,
      };
    }

    case "ellipse": {
      // x, y is center.
      const rx = shape.radiusX ?? 0;
      const ry = shape.radiusY ?? 0;
      return {
        x: (shape.x ?? 0) - rx,
        y: (shape.y ?? 0) - ry,
        width: rx * 2,
        height: ry * 2,
      };
    }

    case "emanation": {
      // Expands the embedded base shape by `radius` on every side.
      const base = compute_region_shape_bounds(shape.base);
      if (!base) return null;
      const r = shape.radius ?? 0;
      return {
        x: base.x - r,
        y: base.y - r,
        width: base.width + r * 2,
        height: base.height + r * 2,
      };
    }

    case "cone": {
      // x, y is the apex; bounded by the outer circle of `radius`.
      const r = shape.radius ?? 0;
      return {
        x: (shape.x ?? 0) - r,
        y: (shape.y ?? 0) - r,
        width: r * 2,
        height: r * 2,
      };
    }

    case "ring": {
      // x, y is center. Outer radius is radius + outerWidth.
      const outer = (shape.radius ?? 0) + (shape.outerWidth ?? 0);
      return {
        x: (shape.x ?? 0) - outer,
        y: (shape.y ?? 0) - outer,
        width: outer * 2,
        height: outer * 2,
      };
    }

    case "line": {
      // x, y is the origin endpoint; stroke `width` spreads perpendicular.
      const ox = shape.x ?? 0;
      const oy = shape.y ?? 0;
      const len = shape.length ?? 0;
      const w = shape.width ?? 0;
      const rot = ((shape.rotation ?? 0) * Math.PI) / 180;
      const ex = ox + (len * Math.cos(rot));
      const ey = oy + (len * Math.sin(rot));
      const halfW = w / 2;
      const minX = Math.min(ox, ex) - halfW;
      const maxX = Math.max(ox, ex) + halfW;
      const minY = Math.min(oy, ey) - halfW;
      const maxY = Math.max(oy, ey) + halfW;
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }

    case "polygon": {
      // Flat array [x0, y0, x1, y1, ...].
      const pts = shape.points;
      if (!pts?.length) return null;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (let i = 0; i < pts.length; i += 2) {
        const px = pts[i], py = pts[i + 1];
        if (px < minX) minX = px;
        if (py < minY) minY = py;
        if (px > maxX) maxX = px;
        if (py > maxY) maxY = py;
      }
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }

    case "token": {
      // x, y is top-left (pixels); width, height are in grid spaces.
      const grid = canvas?.scene?.grid ?? canvas?.grid;
      const gridSize = grid?.size ?? 100;
      return {
        x: shape.x ?? 0,
        y: shape.y ?? 0,
        width: (shape.width ?? 1) * gridSize,
        height: (shape.height ?? 1) * gridSize,
      };
    }

    case "grid": {
      // Union of grid-cell offsets {i: row, j: column}. Use
      // grid.getTopLeftPoint() when available so hex grids resolve right.
      const offsets = shape.offsets;
      if (!offsets?.length) return null;
      const grid = canvas?.scene?.grid ?? canvas?.grid;
      const gridSize = grid?.size ?? 100;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const off of offsets) {
        let cellX, cellY;
        if (grid && typeof grid.getTopLeftPoint === "function") {
          const tl = grid.getTopLeftPoint(off);
          cellX = tl.x;
          cellY = tl.y;
        } else {
          cellX = (off.j ?? 0) * gridSize;
          cellY = (off.i ?? 0) * gridSize;
        }
        if (cellX < minX) minX = cellX;
        if (cellY < minY) minY = cellY;
        if (cellX + gridSize > maxX) maxX = cellX + gridSize;
        if (cellY + gridSize > maxY) maxY = cellY + gridSize;
      }
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }

    default:
      _warnUnknownType("region shape", shape.type);
      return null;
  }
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

export function get_object_canvas_data(inObject, { measure = false, uuid = true }={}) {
  inObject = inObject?.object ?? inObject;
  const data = {
    ...get_object_position(inObject, { measure }),
    ...get_object_dimensions(inObject?.mesh ?? inObject?.tile ?? inObject),
    elevation: get_object_elevation(inObject),
    cachedLocation: true,
  };
	if(uuid) {
		data["uuid"] = inObject?.document?.uuid ?? inObject?.uuid;
	}
	return data;
}

export function get_object_elevation(inObject) {
  const e = inObject?.document?.elevation ?? inObject?.elevation ?? 0;
  // RegionDocument.elevation is { top, bottom } (either may be null for
  // unbounded); every other placeable's elevation is a scalar number.
  // Collapse the object to its floor so downstream Math.max / arithmetic
  // and PIXI sort comparisons receive a real number.
  return typeof e === "object" ? (e?.bottom ?? e?.top ?? 0) : e;
}

/**
 * Vertical extent of a placeable as `[bottom, top, topInclusive]` in
 * scene elevation units. Regions contribute their elevation range and
 * `topInclusive` flag, Tokens their depth, anything else returns top
 * equal to bottom. Returns null when there's no elevation field.
 *
 * @param {PlaceableObject|foundry.abstract.Document|null|undefined} inObject
 * @returns {[number, number, boolean]|null}
 */
export function get_object_vertical_extent(inObject) {
  const doc = inObject?.document ?? inObject;
  if (!doc) return null;
  const elevation = doc.elevation;

  // Range-elevation documents (Region).
  if (elevation && typeof elevation === "object") {
    const bottom = elevation.bottom ?? -Infinity;
    const top = elevation.top ?? Infinity;
    return [bottom, top, !!elevation.topInclusive];
  }

  // Token: feet + (depth × grid.distance). Matches v14 token.mjs.
  if (typeof elevation === "number" && typeof doc.depth === "number") {
    const gridDistance = doc.parent?.grid?.distance ?? canvas?.scene?.grid?.distance ?? 1;
    return [elevation, elevation + (doc.depth * gridDistance), false];
  }

  if (typeof elevation === "number") {
    return [elevation, elevation, false];
  }

  return null;
}

export function get_mouse_position(snapToGrid = false) {
  const pos = lib.getCanvasMouse().getLocalPosition(canvas.app.stage);

	const snappingOptions = {
		mode: CONST.GRID_SNAPPING_MODES.CENTER | CONST.GRID_SNAPPING_MODES.VERTEX | CONST.GRID_SNAPPING_MODES.EDGE_MIDPOINT
	};

	return !snapToGrid
		? new PIXI.Point(pos.x, pos.y)
		: canvas.grid.getSnappedPoint({ x: pos.x, y: pos.y }, snappingOptions)
}

export function distance_between(p1, p2) {
  return new foundry.canvas.geometry.Ray(p1, p2).distance;
}


export function validateObject(inObject, sceneId) {
  if (lib.is_UUID(inObject) || !is_object_canvas_data(inObject)) {
    inObject = lib.get_object_from_scene(inObject, sceneId);
  }
  return inObject?._object ?? inObject;
}

export function getPositionFromData(data, type="source", twister = false) {
  const source = data.nameOffsetMap[data[type]]
    ? data.nameOffsetMap[data[type]][type]
    : validateObject(data[type], data.sceneId);

  const position = source instanceof foundry.canvas.placeables.PlaceableObject
      ? get_object_position(source)
      : source?.worldPosition || source?.center || source;

	let offset = getOffsetFromData(data, { source, type, twister });

  const result = {
		x: position.x - offset.x,
	  y: position.y - offset.y,
  };
  if (typeof position?.elevation === "number") {
    result.elevation = position.elevation;
  }
  return result;
}

export function getOffsetFromData(data, { source = false, type = "source", twister = false }={}) {
	if(!source){
		source = data.nameOffsetMap[data[type]]
			? data.nameOffsetMap[data[type]][type]
			: validateObject(data[type], data.sceneId);
	}

	const multiplier = data.randomOffset?.[type];
	twister = twister || lib.createMersenneTwister(data.seed);

	let offset = { x: 0, y: 0 };

	if (source && multiplier) {
		let randomOffset = get_random_offset(
			source,
			multiplier,
			twister
		);
		offset.x += randomOffset.x;
		offset.y += randomOffset.y;
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
			newOffset = rotateAroundPoint(
				0,
				0,
				newOffset.x,
				newOffset.y,
				source?.rotation ?? 0
			);
		}
		offset.x += newOffset.x;
		offset.y += newOffset.y;
	}

	return offset;
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

export function rotateAroundPoint(cx, cy, x, y, radians) {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const nx = cos * (x - cx) + sin * (y - cy) + cx;
  const ny = cos * (y - cy) - sin * (x - cx) + cy;
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
	if (inOptions?.screenSpace !== undefined && typeof inOptions.screenSpace !== "boolean") {
		return `inOptions.screenSpace must be of type boolean`;
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
	if (
		inOptions?.absolute !== undefined &&
		typeof inOptions.absolute !== "boolean"
	) {
		return `inOptions.absolute must be of type boolean`;
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
    absolute: inOptions?.absolute ?? false,
	  screenSpace: inOptions?.screenSpace ?? false,
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
	if (inOptions?.screenSpace !== undefined && typeof inOptions.screenSpace !== "boolean") {
		return `inOptions.screenSpace must be of type boolean`;
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
	  screenSpace: inOptions?.screenSpace ?? false,
  };
}
