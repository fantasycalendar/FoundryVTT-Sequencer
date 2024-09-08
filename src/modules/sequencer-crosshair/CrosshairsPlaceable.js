import { get_mouse_position, get_object_position, } from "../../lib/canvas-lib.js";
import { is_real_number } from "../../lib/lib.js";

export default class CrosshairsPlaceable extends MeasuredTemplate {

	#handlers = {
		confirm: null,
		cancel: null,
		move: null,
		wheel: null,
	};

	newDrawing = null;

	#promise = {
		resolve: null,
		reject: null,
	};

	isDrag = false;
	#customText = false;
	#distanceText = false;

	get crosshair() {
		return this.document.crosshair;
	}

	get callbacks() {
		return this.document.callbacks;
	}

	async draw() {
		await super.draw();

		this.controlIcon.renderable = this.crosshair.icon.display;
		if (this.crosshair.icon.texture) {
			this.controlIcon.iconSrc = this.crosshair.icon.texture;
			this.controlIcon.texture = await loadTexture(this.controlIcon.iconSrc);
			this.controlIcon.icon.texture = this.controlIcon.texture;
		}
		if (!this.crosshair.icon.borderVisible) {
			this.controlIcon.bg.clear();
		}

		return this;
	}

	get shapeWidth() {
		return this.shape.width ?? 0;
	}

	get shapeHeight() {
		return this.shape.height ?? 0;
	}

	_refreshRulerText() {
		if (this.crosshair.location.showRange && this.crosshair.location.obj) {
			const { units } = this.document.parent.grid;
			const objLocation = this.crosshair.location.obj?.center ?? this.crosshair.location.obj;
			const distance = canvas.grid.measurePath([objLocation, this.position]).distance + " " + units;
			if (!this.#distanceText && this.crosshair.location.obj) {
				const style = CONFIG.canvasTextStyle.clone();
				style.align = "center";
				this.#distanceText = this.template.addChild(new PreciseText(distance.toString(), style));
				const actualHeight = (this.shapeHeight || this.shape.radius * 2) - (canvas.grid.size / 4);
				this.#distanceText.anchor.set(0.5, 0.5);
				this.#distanceText.position.set(
					(this.shapeWidth / 2),
					actualHeight
				);
			}
			this.#distanceText.text = distance.toString();
		}
		this.ruler.renderable = this.crosshair.label.display;
		if (!this.crosshair.label.display) return;
		if (this.crosshair.label?.text) {
			if (this.#customText) return;
			const style = CONFIG.canvasTextStyle.clone();
			style.align = "center";
			this.#customText = this.template.addChild(new PreciseText(this.crosshair.label.text, style));
			this.#customText.anchor.set(0.5);
			this.#customText.position.set(
				(this.shapeWidth / 2) + this.crosshair.label.dx ?? 0,
				(this.shapeHeight / 2) + this.crosshair.label.dy ?? 0
			);
		} else {
			return super._refreshRulerText();
		}
	}

	_refreshTemplate() {
		const t = this.template.clear();

		// Draw the Template outline
		t.lineStyle(this._borderThickness, this.document.borderColor, 0.75).beginFill(0x000000, 0.0);

		// Fill Color or Texture
		if (this.texture) t.beginTextureFill({ texture: this.texture });
		else t.beginFill(0x000000, 0.0);

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
		this.updatePosition();
		if (this.callbacks["show"]) {
			this.callbacks["show"](this);
		}
		return this.activateShowListeners();
	}

	async activateShowListeners() {
		return new Promise((resolve, reject) => {
			this.#promise.resolve = resolve;
			this.#promise.reject = reject;
			this.#handlers.move = this._onMove.bind(this);
			this.#handlers.confirm = this._onConfirm.bind(this);
			this.#handlers.cancel = this._onCancel.bind(this);
			this.#handlers.wheel = this._onWheel.bind(this);
			// Canvas.stage.removeAllListeners();
			canvas.stage.on("mousemove", this.#handlers.move);
			canvas.stage.on("mouseup", this.#handlers.confirm);
			canvas.app.view.oncontextmenu = this.#handlers.cancel;
			canvas.app.view.onwheel = this.#handlers.wheel;
		});
	}

	getSnappedPoint(point, mode = this.crosshair.snap.position) {
		return canvas.grid.getSnappedPoint(point, { mode, resolution: 1 });
	}

	_onMove(evt) {
		evt.preventDefault();

		const now = Date.now();
		const leftDown = (evt.buttons & 1) > 0;
		this.isDrag = !!(leftDown && canvas.mouseInteractionManager.isDragging);

		canvas.mouseInteractionManager.cancel(evt);

		// Apply a 20ms throttle
		if (now - this.moveTime <= 20) return;

		this.updatePosition();

		if (this.callbacks["move"]) {
			this.callbacks["move"](this);
		}

		this.refresh();
		this.moveTime = now;
	}

	handleLockedEdge(mouseLocation) {

		let snappedMouseLocation = this.getSnappedPoint(mouseLocation, CONST.GRID_SNAPPING_MODES.CENTER);
		const { lockToEdgeDirection } = this.crosshair.location;

		const placeable = this.crosshair.location.obj;
		const shape = placeable.getShape();
		const { w, h } = this.crosshair.location.obj;

		const shapePoints = shape?.points ?? [0, 0, w, 0, w, h, 0, h];
		const points = shapePoints.map((point, i) => {
			const worldCoord = i % 2 === 0
				? (placeable.document.x)
				: (placeable.document.y)
			return point + worldCoord;
		});

		const centerPoint = placeable.getCenterPoint();
		const ray = new Ray(centerPoint, mouseLocation);

		let intersection;
		for (let i = 0; i < points.length; i += 2) {
			intersection = ray.intersectSegment([points[i], points[i + 1], points[i + 2 >= points.length ? 0 : i + 2], points[i + 3 >= points.length ? 1 : i + 3]]);
			if (intersection) break;
		}

		if (!intersection) return;

		let snappedIntersection = this.getSnappedPoint(intersection, CONST.GRID_SNAPPING_MODES.EDGE_MIDPOINT);

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
			const snappedDirection = this.getSnappedPoint(lockedRay.B, CONST.GRID_SNAPPING_MODES.CENTER)
			snappedMouseLocation.x = snappedDirection.x;
			snappedMouseLocation.y = snappedDirection.y;
		}

		const { direction, distance } = this._getDraggedMatrix(snappedIntersection, snappedMouseLocation);

		this.document.updateSource({
			...snappedIntersection,
			direction,
			distance
		});

	}

	handleLocked(mouseLocation, targetLocation) {

		const edgeLocation = Ray.towardsPoint(
			targetLocation,
			mouseLocation,
			this.crosshair.location.lockOffsetDistance * this.document.parent.grid.size
		).B;

		const snappedPosition = this.getSnappedPoint(edgeLocation);

		const { direction, distance } = this._getDraggedMatrix(snappedPosition, mouseLocation);

		const validatedLocation = {
			x: Number.isNaN(snappedPosition.x) ? this.document.x : snappedPosition.x,
			y: Number.isNaN(snappedPosition.y) ? this.document.y : snappedPosition.y,
		};

		this.document.updateSource({
			...validatedLocation,
			distance,
			direction
		});

	}

	handleLimit(mouseLocation, targetLocation) {

		const ray = new Ray(targetLocation, mouseLocation);
		const gridPath = canvas.grid.measurePath([targetLocation, mouseLocation]);

		const limitMinRange = is_real_number(this.crosshair.location.limitMinRange) ? this.crosshair.location.limitMinRange : 0;
		const limitMaxRange = is_real_number(this.crosshair.location.limitMaxRange) ? this.crosshair.location.limitMaxRange : Infinity;

		const cappedDistance = Math.max(limitMinRange, Math.min(limitMaxRange, Math.floor(gridPath.distance / this.document.parent.grid.distance))) * this.document.parent.grid.size;

		const ratioLocation = limitMaxRange !== Infinity ? ray.project(cappedDistance / ray.distance) : mouseLocation;
		const snappedPosition = this.getSnappedPoint(ratioLocation);

		this.document.updateSource(snappedPosition);

	}

	updatePosition() {

		let mouseLocation = get_mouse_position();

		mouseLocation.x += this.crosshair.location.offset.x ?? 0;
		mouseLocation.y += this.crosshair.location.offset.y ?? 0;

		if (this.crosshair.location.obj && (this.crosshair.location.lock || this.crosshair.location.limit)) {

			const location = this.crosshair.location.obj;
			const targetLocation = {
				x: location?.center?.x ?? location?.position?.x ?? location?.x,
				y: location?.center?.y ?? location?.position?.y ?? location?.y
			};

			if (this.crosshair.location.lock) {

				if (this.crosshair.location.edge) {

					this.handleLockedEdge(mouseLocation);

				} else {

					this.handleLocked(mouseLocation, targetLocation);

				}
			} else if (this.crosshair.location.limit) {

				this.handleLimit(mouseLocation, targetLocation);

			}

		} else if (this.isDrag) {
			const { direction, distance } = this._getDraggedMatrix(this.document, mouseLocation);
			this.document.updateSource({
				distance,
				direction
			});
		} else {
			const snappedPosition = this.getSnappedPoint(mouseLocation);
			this.document.updateSource({
				x: snappedPosition.x,
				y: snappedPosition.y,
			});
		}

	}

	_getDraggedMatrix(source, target) {

		const dragAngle = (new Ray(source, target)).angle;
		const dragDistance = canvas.grid.measurePath([source, target]);

		let distance = Math.max(0.5, dragDistance.distance);

		if (this.crosshair.distanceMinMax.min && this.crosshair.distanceMinMax.max) {
			distance = Math.min(Math.max(distance, this.crosshair.distanceMinMax.min), this.crosshair.distanceMinMax.max);
		}

		const direction = this.crosshair.snap.direction
			? Math.round(Math.toDegrees(dragAngle) / this.crosshair.snap.direction) * this.crosshair.snap.direction
			: Math.toDegrees(dragAngle);

		return {
			direction: direction || 0,
			distance: this.crosshair.distanceMinMax.locked ? this.document.distance : distance
		};

	}

	/** @override */
	_destroy(options = {}) {
		super._destroy(options);
		this._clearHandlers();
	}

	_clearHandlers(evt) {
		this.layer.interactiveChildren = this.oldInteractiveChildren;
		if (this.newDrawing) this.newDrawing.destroy();
		canvas.stage.off("mousemove", this.#handlers.move);
		canvas.stage.off("mouseup", this.#handlers.confirm);
		canvas.app.view.oncontextmenu = null;
		canvas.app.view.onwheel = null;
		canvas.mouseInteractionManager.reset({ interactionData: true, state: false });
	}

	_onConfirm(evt) {
		evt.preventDefault();
		canvas.mouseInteractionManager.cancel(evt);
		if (this.isDrag) {
			this.isDrag = false;
			canvas.mouseInteractionManager.reset({
				interactionData: true,
				state: false,
			});
			return;
		}

		this.document.endPosition = this.document.t === CONST.MEASURED_TEMPLATE_TYPES.CONE || CONST.MEASURED_TEMPLATE_TYPES.RAY
			? get_object_position(this, { measure: true })
			: null;

		this.destroy();
		this.#promise.resolve(this.document);
	}

	_onCancel(evt) {
		if (this.isDrag) {
			this.isDrag = false;
			canvas.mouseInteractionManager.reset({
				interactionData: true,
				state: false,
			});
			return;
		}
		this.destroy();
		this.#promise.reject(this.document);
	}

	_onWheel(evt) {

		if (!evt.altKey && !evt.ctrlKey && !evt.shiftKey) return;

		evt.stopPropagation();

		if (evt.shiftKey) this.updateDirection(evt)

		if (evt.altKey) this.updateDistance(evt);

		if (evt.ctrlKey) {
			// TODO widen
		}

		this.refresh();
	}

	updateDistance(evt) {
		/* Scroll up = bigger */
		const step = (this.document.parent.grid.distance / 2);
		const delta = step * Math.sign(-evt.deltaY);
		let distance = this.document.distance + delta;
		distance = Math.max(0.5, distance.toNearest(step));
		if (this.crosshair.distanceMinMax.min && this.crosshair.distanceMinMax.max) {
			distance = Math.min(Math.max(distance, this.crosshair.distanceMinMax.min), this.crosshair.distanceMinMax.max);
		}
		this.document.updateSource({ distance });
	}

	updateDirection(evt) {
		if (this.crosshair.lockManualRotation) return;
		const scrollDelta = Math.sign(evt.deltaY);
		let delta = this.crosshair.snap.direction ? this.crosshair.snap.direction * scrollDelta : scrollDelta * 5;
		if (delta < 0) delta += 360;
		if (delta > 360) delta -= 360;
		const direction = Math.max(1, this.document.direction + delta);
		this.document.updateSource({ direction });
	}

	_getGridHighlightPositions() {
		if (!this.crosshair.gridHighlight) return [];
		return super._getGridHighlightPositions();
	}
}
