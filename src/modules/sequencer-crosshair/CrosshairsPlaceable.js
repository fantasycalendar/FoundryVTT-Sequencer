import { get_mouse_position, } from "../../lib/canvas-lib.js";
import { is_real_number } from "../../lib/lib.js";
import CONSTANTS from "../../constants.js";

export default class CrosshairsPlaceable extends MeasuredTemplate {

	constructor(...args) {
		super(...args);
		this.cachedLocation = false;
	}

	#handlers = {
		mouseup: null, move: null, wheel: null
	};

	newDrawing = null;

	#promise = {
		resolve: null,
	};

	isDrag = false;
	#customText = false;
	#distanceText = false;
	isValid = true;

	#lastPositions = false;

	get crosshair() {
		return this.document.crosshair;
	}

	get callbacks() {
		return this.document.callbacks;
	}

	get range(){
		const objLocation = this.crosshair.location.obj?.center ?? this.crosshair.location.obj;
		return canvas.grid.measurePath([objLocation, this.position]).distance;
	}

	async #refreshIcon() {
		this.controlIcon.renderable = !!this.crosshair.icon.texture;
		if (this.crosshair.icon.texture) {
			this.controlIcon.iconSrc = this.crosshair.icon.texture;
			this.controlIcon.texture = await loadTexture(this.controlIcon.iconSrc);
			this.controlIcon.icon.texture = this.controlIcon.texture;
		}
		if (!this.crosshair.icon.borderVisible) {
			this.controlIcon.bg.clear();
		}
	}

	_refreshRulerText() {
		const shapeWidth = this.shape.width ?? 0;
		const shapeHeight = this.shape.height ?? 0;
		if (this.crosshair.location.showRange && this.crosshair.location.obj) {
			if (!this.#distanceText && this.crosshair.location.obj) {
				const style = CONFIG.canvasTextStyle.clone();
				style.align = "center";
				this.#distanceText = this.template.addChild(new PreciseText("", style));
			}
			const actualHeight = (this.shapeHeight || this.shape.radius) + (canvas.grid.size / 2);
			this.#distanceText.anchor.set(0.5, 0.5);
			this.#distanceText.position.set((shapeWidth / 2), actualHeight);
			const { units } = this.document.parent.grid;
			this.#distanceText.text = this.range.toString() + " " + units;
		}
		this.ruler.renderable = !!this.crosshair.label?.text;
		if (!this.ruler.renderable) return;
		if (this.crosshair.label?.text) {
			if (!this.#customText) {
				const style = CONFIG.canvasTextStyle.clone();
				style.align = "center";
				this.#customText = this.template.addChild(new PreciseText("", style));
			}
			if (this.#customText.text !== this.crosshair.label.text) this.#customText.text = this.crosshair.label.text;
			this.#customText.anchor.set(0.5);
			this.#customText.position.set(
				(shapeWidth / 2) + this.crosshair.label.dx ?? 0,
				(shapeHeight / 2) + this.crosshair.label.dy ?? 0
			);
		} else {
			if (this.#customText) {
				this.#customText.text = "";
				this.#customText.destroy();
				this.#customText = null;
			}
			return super._refreshRulerText();
		}
	}

	_refreshTemplate() {
		const t = this.template.clear();

		// Draw the Template outline
		t.lineStyle(this._borderThickness, this.document.borderColor, 0.75).beginFill(0x000000, 0.0);

		// Fill Color or Texture
		if (this.texture) t.beginTextureFill({ texture: this.texture }); else t.beginFill(0x000000, 0.0);

		// Draw the shape
		t.drawShape(this.shape);

		if (!this.crosshair.lockDrag) {
			// Draw origin and destination points
			t.lineStyle(this._borderThickness, 0x000000)
				.beginFill(0x000000, 0.5)
				.drawCircle(0, 0, 6)
				.drawCircle(this.ray.dx, this.ray.dy, 6)
				.endFill();
		}
	}

	async show() {
		await this.draw();
		this.layer.addChild(this);
		this.oldInteractiveChildren = this.layer.interactiveChildren;
		this.layer.interactiveChildren = false;
		this.#updateLocation();
		this.#runCallback(CONSTANTS.CALLBACKS.SHOW, this);
		return this.activateShowListeners();
	}

	async activateShowListeners() {
		return new Promise((resolve) => {
			this.#promise.resolve = resolve;
			this.#handlers.move = this.#onMove.bind(this);
			this.#handlers.mouseup = this.#onMouseUp.bind(this);
			this.#handlers.wheel = this.#onWheel.bind(this);
			// Canvas.stage.removeAllListeners();
			canvas.stage.on("mousemove", this.#handlers.move);
			canvas.stage.on("pointerup", this.#handlers.mouseup);
			canvas.app.view.onwheel = this.#handlers.wheel;
		});
	}

	#getSnappedPoint(point, mode = this.crosshair.snap.position) {
		return canvas.grid.getSnappedPoint(point, { mode, resolution: 1 });
	}

	#onMove(evt) {

		const now = Date.now();
		const leftDown = (evt.buttons & 1) > 0;
		const rightDown = (evt.buttons & 2) > 0;
		this.isDrag = !!(leftDown && canvas.mouseInteractionManager.isDragging);
		this.isPanning = !!(rightDown && canvas.mouseInteractionManager.isDragging);

		if (this.isPanning) return;

		if (this.isDrag) {
			canvas.mouseInteractionManager.cancel(evt);
		}

		evt.preventDefault();

		// Apply a 20ms throttle
		if (now - this.moveTime <= 20) return;

		const moved = this.#updateLocation();

		this.#runCallback(CONSTANTS.CALLBACKS.MOUSE_MOVE, this);
		if (moved) this.#runCallback(CONSTANTS.CALLBACKS.MOVE, this);

		this.#updateLineOfSight();

		this.refresh();
		this.moveTime = now;
	}

	#updateLineOfSight() {

		if (!this.crosshair.location?.obj || this.crosshair.location?.wallBehavior === CONSTANTS.PLACEMENT_RESTRICTIONS.ANYWHERE) return;

		const object = this.crosshair.location.obj;
		const objLocation = {
			x: object?.center?.x ?? object?.position?.x ?? object?.x,
			y: object?.center?.y ?? object?.position?.y ?? object?.y
		};
		const location = { x: this.document.x, y: this.document.y };

		const exitEarly = this.#lastPositions && (this.#lastPositions.obj.x === objLocation.x
			&& this.#lastPositions.obj.y === objLocation.y
			&& this.#lastPositions.tgt.x === location.x
			&& this.#lastPositions.tgt.y === location.y);

		this.#lastPositions = {
			obj: objLocation,
			tgt: location
		}

		if (exitEarly) return;

		const type = this.crosshair.location?.wallBehavior === CONSTANTS.PLACEMENT_RESTRICTIONS.LINE_OF_SIGHT
			? "sight"
			: "move";

		const collisions = CONFIG.Canvas.polygonBackends.sight.testCollision(objLocation, location, {
			type,
			useThreshold: true
		});

		this.isValid = !collisions.length;

		if (collisions.length) this.#runCallback(CONSTANTS.CALLBACKS.COLLIDE, this, collisions);

	}

	#handleLockedEdge(mouseLocation) {

		let snappedMouseLocation = this.#getSnappedPoint(mouseLocation, CONST.GRID_SNAPPING_MODES.CENTER);
		const { lockToEdgeDirection } = this.crosshair.location;

		const placeable = this.crosshair.location.obj;
		const shape = placeable.getShape();
		const { w, h } = this.crosshair.location.obj;

		const shapePoints = shape?.points ?? [0, 0, w, 0, w, h, 0, h];
		const points = shapePoints.map((point, i) => {
			const worldCoord = i % 2 === 0 ? (placeable.document.x) : (placeable.document.y)
			return point + worldCoord;
		});

		const centerPoint = placeable.getCenterPoint();
		const ray = new Ray(centerPoint, mouseLocation);

		let intersection;
		for (let i = 0; i < points.length; i += 2) {
			intersection = ray.intersectSegment([points[i], points[i + 1], points[i + 2 >= points.length ? 0 : i + 2], points[i + 3 >= points.length ? 1 : i + 3]]);
			if (intersection) break;
		}

		if (!intersection) return {};

		let snappedIntersection = this.#getSnappedPoint(intersection, CONST.GRID_SNAPPING_MODES.EDGE_MIDPOINT);

		if (canvas.scene.grid.type === CONST.GRID_TYPES.SQUARE) {
			const size = this.document.parent.grid.size;
			const left = snappedMouseLocation.x < points[0]
			const above = snappedMouseLocation.y < points[1];
			const right = snappedMouseLocation.x > points[2];
			const below = snappedMouseLocation.y > points[5];
			if ((left || right) && (below || above)) {
				snappedIntersection.x = left ? points[0] - size : (right ? points[2] + size : snappedIntersection.x);
				snappedIntersection.y = above ? points[1] - size : (right ? points[5] + size : snappedIntersection.y);
				if (above && left) {
					snappedIntersection.x = points[0];
					snappedIntersection.y = points[1];
				} else if (above && right) {
					snappedIntersection.x = points[2];
					snappedIntersection.y = points[3];
				} else if (below && right) {
					snappedIntersection.x = points[4];
					snappedIntersection.y = points[5];
				} else if (below && left) {
					snappedIntersection.x = points[6];
					snappedIntersection.y = points[7];
				}
			}
		}

		if (lockToEdgeDirection) {
			const lockedRay = Ray.towardsPoint(snappedIntersection, snappedMouseLocation, 2)
			const snappedDirection = this.#getSnappedPoint(lockedRay.B, CONST.GRID_SNAPPING_MODES.CENTER)
			snappedMouseLocation.x = snappedDirection.x;
			snappedMouseLocation.y = snappedDirection.y;
		}

		const { direction, distance } = this.#getDraggedMatrix(snappedIntersection, snappedMouseLocation);

		return {
			...snappedIntersection, direction, distance
		};

	}

	#handleLimit(mouseLocation, targetLocation) {

		const ray = new Ray(targetLocation, mouseLocation);
		const gridPath = canvas.grid.measurePath([targetLocation, mouseLocation]);

		const limitMinRange = is_real_number(this.crosshair.location.limitMinRange) ? this.crosshair.location.limitMinRange : 0;
		const limitMaxRange = is_real_number(this.crosshair.location.limitMaxRange) ? this.crosshair.location.limitMaxRange : Infinity;

		let finalLocation = mouseLocation;
		if (gridPath.cost < limitMinRange) {
			finalLocation = canvas.grid.getTranslatedPoint(targetLocation, Math.toDegrees(ray.angle), limitMinRange);
		} else if (gridPath.cost > limitMaxRange) {
			finalLocation = canvas.grid.getTranslatedPoint(targetLocation, Math.toDegrees(ray.angle), limitMaxRange);
		}

		const snappedPosition = this.#getSnappedPoint(finalLocation);
		const { direction, distance } = this.#getDraggedMatrix(targetLocation, snappedPosition);

		return {
			...snappedPosition, direction, distance
		};

	}

	#updateLocation() {

		let mouseLocation = get_mouse_position();

		mouseLocation.x += this.crosshair.location.offset.x ?? 0;
		mouseLocation.y += this.crosshair.location.offset.y ?? 0;

		let update;

		if (this.crosshair.location.obj && (this.crosshair.location.lockToEdge || this.crosshair.location.limitMinRange || this.crosshair.location.limitMaxRange)) {

			const location = this.crosshair.location.obj;
			const targetLocation = {
				x: location?.center?.x ?? location?.position?.x ?? location?.x,
				y: location?.center?.y ?? location?.position?.y ?? location?.y
			};

			if (this.crosshair.location.lockToEdge) {
				update = this.#handleLockedEdge(mouseLocation);
			} else if (this.crosshair.location.limitMinRange || this.crosshair.location.limitMaxRange) {
				update = this.#handleLimit(mouseLocation, targetLocation);
			}

		} else if (this.isDrag) {
			const { direction, distance } = this.#getDraggedMatrix(this.document, mouseLocation);
			update = { distance, direction };
		} else {
			const snappedPosition = this.#getSnappedPoint(mouseLocation);
			update = {
				x: snappedPosition.x, y: snappedPosition.y
			};
		}

		const isChanged = update?.x !== undefined && this.document.x !== update.x || update?.y !== undefined && this.document.y !== update.y || update?.direction !== undefined && this.document.direction !== update.direction || update?.distance !== undefined && this.document.distance !== update.distance;

		this.document.updateSource(update);

		return isChanged;
	}

	#getDistance(dragDistance) {
		if (this.crosshair.distanceMin === null && this.crosshair.distanceMax === null){
			return this.document.distance;
		}
		const min = this.crosshair.distanceMin ?? this.document.originalConfig.distance;
		const max = this.crosshair.distanceMax ?? this.document.originalConfig.distance;
		return Math.min(Math.max(0.5, dragDistance, min), max);
	}

	#getDraggedMatrix(source, target) {

		const dragAngle = (new Ray(source, target)).angle;
		const dragDistance = canvas.grid.measurePath([source, target]);

		const direction = this.crosshair.snap.direction
			? Math.round(Math.toDegrees(dragAngle) / this.crosshair.snap.direction) * this.crosshair.snap.direction
			: Math.toDegrees(dragAngle);

		return {
			direction: direction || 0,
			distance: this.#getDistance(dragDistance.distance)
		};

	}

	#onMouseUp(evt) {
		const event = evt?.nativeEvent ?? evt;
		if (!(event.which === 1 || event.which === 3)) return;
		if (this.isDrag) {
			this.isDrag = false;
			return;
		}
		if (this.isPanning) {
			this.isPanning = false;
			return;
		}
		return event.which === 1 ? this.#onConfirm() : this.#onCancel();
	}

	#onConfirm() {
		const position = this.document.getOrientation();
		if (!this.isValid) {
			this.#runCallback(CONSTANTS.CALLBACKS.INVALID_PLACEMENT, position);
			return;
		}
		const placedCallback = this.#runCallback(CONSTANTS.CALLBACKS.PLACED, position);
		if (placedCallback === false) return;
		this.cachedLocation = position;
		this.#promise.resolve(this.document);
		this.destroy();
	}

	#onCancel() {
		this.#runCallback(CONSTANTS.CALLBACKS.CANCEL);
		this.#promise.resolve(false);
		this.destroy();
	}

	#runCallback(name, ...params) {
		if (!this.callbacks[name]) return;
		return this.callbacks[name](...params);
	}

	#clearHandlers() {
		this.layer.interactiveChildren = this.oldInteractiveChildren;
		if (this.newDrawing) this.newDrawing.destroy();
		canvas.stage.off("mousemove", this.#handlers.move);
		canvas.stage.off("pointerup", this.#handlers.mouseup);
		canvas.app.view.onwheel = null;
	}

	#onWheel(evt) {

		if (!evt.altKey && !evt.ctrlKey && !evt.shiftKey) return;

		evt.stopPropagation();

		if (evt.shiftKey) this.#updateDirection(evt)

		if (evt.altKey) this.#updateDistance(evt);

		if (evt.ctrlKey) {
			// TODO widen
		}

		this.refresh();
	}

	#updateDistance(evt) {
		const step = (this.document.parent.grid.distance / 2);
		const delta = step * Math.sign(-evt.deltaY);
		let distance = this.document.distance + delta;
		distance = Math.max(0.5, distance.toNearest(step));
		distance = this.#getDistance(distance)
		this.document.updateSource({ distance });
	}

	#updateDirection(evt) {
		if (this.crosshair.lockManualRotation) return;
		const scrollDelta = Math.sign(evt.deltaY);
		let delta = this.crosshair.snap.direction ? this.crosshair.snap.direction * scrollDelta : scrollDelta * 5;
		if (delta < 0) delta += 360;
		if (delta > 360) delta -= 360;
		const direction = Math.max(1, this.document.direction + delta);
		this.document.updateSource({ direction });
	}

	/** @override */
	_getGridHighlightPositions() {
		if (!this.crosshair.gridHighlight) return [];
		return super._getGridHighlightPositions();
	}

	/** @override */
	_destroy(options = {}) {
		super._destroy(options);
		this.#clearHandlers();
	}

	/** @override */
	async draw() {
		await super.draw();
		this.#refreshIcon();
		return this;
	}
}
