import { get_mouse_position, get_object_position, } from "../../lib/canvas-lib.js";

export default class CrosshairsPlaceable extends MeasuredTemplate {

	#handlers = {
		confirm: null,
		cancel: null,
		move: null,
		wheel: null,
	};

	#promise = {
		resolve: null,
		reject: null,
	};

	#isDrag = false;

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
			this.controlIcon.icon.iconSrc = this.crosshair.icon.texture;
			this.controlIcon.draw();
		}

		return this;
	}

	_refreshRulerText() {
		this.ruler.renderable = this.crosshair.label.display;
		if (!this.crosshair.label.display) return;
		if (this.crosshair.label?.text) {
			this.ruler.anchor.set(0.5, 2.25);
			this.ruler.position.set(this.crosshair.label.dx ?? 0, this.crosshair.label.dy ?? 0)
			this.ruler.text = this.crosshair.label?.text ?? "";
		} else {
			return super._refreshRulerText();
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
		this.#isDrag = !!(leftDown && canvas.mouseInteractionManager.isDragging);

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

	updatePosition() {

		let mouseLocation = get_mouse_position();

		if (this.crosshair.location.obj) {

			const location = this.crosshair.location.obj;
			const locationX = location?.center?.x ?? location?.position?.x ?? location?.x;
			const locationY = location?.center?.y ?? location?.position?.y ?? location?.y;

			if (this.crosshair.location.lock) {

				if (this.crosshair.location.edge) {

					let position = { x: locationX, y: locationY };
					let snappedMouseLocation = this.getSnappedPoint(mouseLocation, CONST.GRID_SNAPPING_MODES.CENTER);

					const { width, height } = this.crosshair.location?.obj?.bounds ?? {
						width: this.document.parent.grid.size, height: this.document.parent.grid.size
					};

					let onXPositiveSide = mouseLocation.x >= (locationX + Math.floor(width / 2));
					let onXNegativeSide = mouseLocation.x <= (locationX - Math.ceil(width / 2));
					let onYPositiveSide = mouseLocation.y >= (locationY + Math.floor(height / 2));
					let onYNegativeSide = mouseLocation.y <= (locationY - Math.ceil(height / 2));

					if (!(onXPositiveSide || onXNegativeSide || onYPositiveSide || onYNegativeSide)) {
						const absX = Math.abs(locationX - mouseLocation.x);
						const absY = Math.abs(locationY - mouseLocation.y);
						const xOrY = absX >= absY;
						const both = (this.document.parent.grid.size / 10) >= Math.abs(absX - absY);
						onXPositiveSide = (xOrY || both) && mouseLocation.x >= (locationX);
						onXNegativeSide = (xOrY || both) && mouseLocation.x < (locationX);
						onYPositiveSide = (!xOrY || both) && mouseLocation.y >= (locationY);
						onYNegativeSide = (!xOrY || both) && mouseLocation.y < (locationY);
					}

					if (onXPositiveSide || onXNegativeSide) {
						position.x = position.x + (Math.floor(width / 2) * (onXPositiveSide ? 1 : -1))
						snappedMouseLocation.x = position.x + (Math.max(width, height) * (onXPositiveSide ? 1 : -1));
					} else {
						position.x = snappedMouseLocation.x;
					}

					if (onYPositiveSide || onYNegativeSide) {
						position.y = position.y + (Math.floor(height / 2) * (onYPositiveSide ? 1 : -1))
						snappedMouseLocation.y = position.y + (Math.max(width, height) * (onYPositiveSide ? 1 : -1));
					} else {
						position.y = snappedMouseLocation.y;
					}

					const { rotation, distance } = this._getDraggedMatrix(position, snappedMouseLocation);

					this.document.updateSource({
						x: position.x,
						y: position.y,
						distance,
						direction: rotation
					});

				} else {

					const edgeLocation = Ray.towardsPoint(
						{ x: locationX, y: locationY },
						mouseLocation,
						this.crosshair.location.offsetDistance * this.document.parent.grid.size
					).B;

					const snappedPosition = this.getSnappedPoint(edgeLocation);

					const { rotation, distance } = this._getDraggedMatrix(snappedPosition, mouseLocation);

					this.document.updateSource({
						x: snappedPosition.x,
						y: snappedPosition.y,
						distance,
						direction: rotation
					});
				}
			} else if (this.crosshair.location.limit) {

				const ray = new Ray({ x: locationX, y: locationY }, mouseLocation);
				const rayDistance = ray.distance / this.document.parent.grid.size;

				const min = this.crosshair.location.minDistance ?? 0;
				const max = this.crosshair.location.maxDistance ?? Infinity;
				const cappedDistance = Math.max(min, Math.min(max, rayDistance));

				const snappedPosition = this.getSnappedPoint(ray.project(cappedDistance / rayDistance));

				const { rotation, distance } = this._getDraggedMatrix(snappedPosition, mouseLocation);

				this.document.updateSource({
					x: snappedPosition.x,
					y: snappedPosition.y,
					distance,
					direction: rotation
				});

			}

		} else if (this.#isDrag) {
			const { rotation, distance } = this._getDraggedMatrix(this.document, mouseLocation);
			this.document.updateSource({
				distance,
				direction: rotation
			});
		} else if (!this.crosshair.location.obj) {
			const { x, y } = this.getSnappedPoint(mouseLocation);
			this.document.updateSource({ x, y });
		}

	}

	_getDraggedMatrix(source, target, snapDirection = this.crosshair.snap.direction) {

		const drag = new Ray(source, target);

		let distance = Math.max(0.5, drag.distance / this.document.parent.grid.size * this.document.parent.grid.distance);

		if (this.crosshair.distanceMinMax.min && this.crosshair.distanceMinMax.max) {
			distance = Math.min(Math.max(distance, this.crosshair.distanceMinMax.min), this.crosshair.distanceMinMax.max);
		}

		const rotation = snapDirection
			? Math.round(Math.toDegrees(drag.angle) / snapDirection) * snapDirection
			: Math.toDegrees(drag.angle);

		return { rotation, distance };

	}

	/** @override */
	_destroy(options = {}) {
		super._destroy(options);
		this._clearHandlers();
	}

	_clearHandlers(evt) {
		this.layer.interactiveChildren = this.oldInteractiveChildren;
		canvas.stage.off("mousemove", this.#handlers.move);
		canvas.stage.off("mouseup", this.#handlers.confirm);
		canvas.app.view.oncontextmenu = null;
		canvas.app.view.onwheel = null;
		canvas.mouseInteractionManager.reset({ interactionData: true, state: false });
	}

	_onConfirm(evt) {
		evt.preventDefault();
		canvas.mouseInteractionManager.cancel(evt);
		if (this.#isDrag) {
			this.#isDrag = false;
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
		if (this.#isDrag) {
			this.#isDrag = false;
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

		if (evt.shiftKey) {

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

		if (evt.altKey && !this.crosshair.lockManualRotation) {
			const scrollDelta = Math.sign(-evt.deltaY);
			let delta = this.crosshair.snap.direction ? this.crosshair.snap.direction * scrollDelta : scrollDelta * 5;
			if (delta < 0) delta += 360;
			if (delta > 360) delta -= 360;
			const direction = Math.max(1, this.document.direction + delta);
			this.document.updateSource({ direction });
		}

		if (evt.ctrlKey) {
			// TODO widen
		}

		this.refresh();
	}
}
