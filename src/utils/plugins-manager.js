class Plugin {

	constructor(name) {
		this.name = name;
	}

	/**
	 * The effect's source location, eg the target of `.atLocation()` or `.attachTo()`
	 *
	 * @param effect
	 * @param position
	 * @returns {*}
	 */
	sourcePosition({ effect, position }={}) {
		return position;
	}


	/**
	 * The effect's source location, eg the target of `.stretchTo()` or `.rotateTowards()`
	 *
	 * @param effect
	 * @param position
	 * @returns {*}
	 */
	targetPosition({ effect, position }={}) {
		return position;
	}

	/**
	 * The effect's rotation calculation
	 *
	 * @param effect
	 */
	rotation({ effect }={}) { }

	/**
	 * The effect's elevation calculation
	 *
	 * @param effect
	 * @param sort
	 * @returns Number
	 */
	elevation({ effect, sort }={}) {
		return sort;
	}

	static createSpriteContainers({ effect, container }={}) {
		return container;
	}

	/**
	 * makes changes to the effect upon creation
	 *
	 * @param effect
	 */
	createSprite({ effect }={}) { }

	/**
	 * Allows you to make changes to the effect's mask, if used
	 *
	 * @param effect
	 * @param doc
	 * @param obj
	 * @param shape
	 * @returns {*}
	 */
	masking({ effect, doc, obj, shape }={}) {
		return shape
	}

	/**
	 * Which hooks should refresh the masking of the effect
	 *
	 * @returns {*[]}
	 */
	get maskingHooks() {
		return [];
	}
}

class GrapeJuiceIsometrics extends Plugin {

	isIsometricActive(effect) {
		return foundry.utils.getProperty(
			game.scenes.get(effect.data.sceneId),
			`flags.${this.name}.is_isometric`
		)
	}

	sourcePosition({ effect, position, height }={}) {

		if (this.isIsometricActive(effect) && effect.source instanceof PlaceableObject) {
			const elevation = ((effect.sourceDocument.elevation ?? 0) / canvas.scene.grid.distance) * canvas.grid.size;
			position.x += elevation;
			position.y -= elevation;
			if (
				effect.data.isometric?.overlay ||
				effect.target instanceof PlaceableObject
			) {
				position.x += height / 2;
				position.y -= height / 2;
			}
		}

		return position;

	}

	targetPosition({ effect, position, height }={}) {

		if (this.isIsometricActive(effect) && effect.target instanceof PlaceableObject) {
			const targetHeight = height / 2;
			const elevation = ((effect.targetDocument.elevation ?? 0) / canvas.scene.grid.distance) * canvas.grid.size;
			position.x += elevation + targetHeight;
			position.y -= elevation + targetHeight;
		}

		return position;

	}

	rotation({ effect }={}) {

		if (effect.data.stretchTo) {
			let skew = Math.normalizeRadians(
				effect.rotationContainer.rotation - Math.PI / 4
			);

			if (
				Math.abs(skew) >= Math.PI / 2 - 0.5 &&
				Math.abs(skew) <= Math.PI / 2 + 0.5
			) {
				skew -= Math.PI / 2;
			}

			effect.isometricContainer.skew.set(Math.normalizeRadians(skew), 0);
			effect.isometricContainer.rotation = 0;
		} else if (effect.data?.isometric?.overlay) {
			effect.rotationContainer.rotation = 0;
			let skew = Math.PI / 4 + effect.rotationContainer.rotation;
			effect.isometricContainer.skew.set(
				Math.normalizeRadians(skew - Math.PI / 4),
				0
			);
			effect.isometricContainer.scale.set(
				1.0,
				window.scale ?? Math.sqrt(3)
			);
		}

	}

	elevation({ effect, sort }={}) {

		if (this.isIsometricActive(effect)) {
			const sourceSort = effect.source
				? (effect.sourceMesh?.sort ?? 0) + (effect.data.isometric?.overlay ? 1 : -1)
				: 0;
			const targetSort = effect.target
				? (effect.targetMesh?.sort ?? 0) + (effect.data.isometric?.overlay ? 1 : -1)
				: 0;
			sort = Math.max(sourceSort, targetSort);
		}

		return sort;
	}

	createSpriteContainers({ effect, container }={}) {
		effect.isometricContainer = container.addChild(
			new PIXI.Container()
		);
		effect.isometricContainer.id = effect.id + "-isometricContainer";
		return effect.isometricContainer;
	}

	createSprite({ effect }={}) {
		if (this.isIsometricActive(effect)) {
			effect.isometricContainer.rotation = Math.PI / 4;
		}
	}
}

class IsometricPerspective extends GrapeJuiceIsometrics {
	isIsometricActive(effect) {
		return foundry.utils.getProperty(
			game.scenes.get(effect.data.sceneId),
			`flags.${this.name}.isometricEnabled`
		)
	}
}

class WalledTemplates extends Plugin {
	masking({ effect, doc, obj, shape }={}) {
		if (
			obj.walledtemplates?.walledTemplate
		) {
			let wt = obj.walledtemplates.walledTemplate;
			wt.options.padding = 3 * canvas.dimensions.distancePixels;
			shape = wt.computeShape();
			wt.options.padding = 0;
		}
		return shape
	}

	get maskingHooks() {
		return ["createWall", "updateWall", "deleteWall"];
	}
}

class PluginsManager {
	static modules = {
		"grape_juice-isometrics": GrapeJuiceIsometrics,
		"isometric-perspective": IsometricPerspective,
		"walledtemplates": WalledTemplates,
	}
	static plugins = [];

	static initialize() {
		for(const [module, pluginClass] of Object.entries(this.modules)){
			if(!game.modules.get(module)?.active) continue;
			this.plugins.push(new pluginClass(module));
		}
	}

	static sourcePosition({ effect, position, height }={}) {
		for(const plugin of this.plugins){
			position = plugin.sourcePosition({ effect, position, height })
		}
		return position;
	}

	static targetPosition({ effect, position, height }={}) {
		for(const plugin of this.plugins){
			position = plugin.targetPosition({ effect, position, height })
		}
		return position;
	}

	static rotation({ effect }={}) {
		for(const plugin of this.plugins){
			plugin.rotation({ effect })
		}
	}

	static elevation({ effect, sort }={}) {
		for(const plugin of this.plugins){
			sort = plugin.elevation({ effect, sort })
		}
		return sort;
	}

	static createSpriteContainers({ effect, container }={}){
		for(const plugin of this.plugins){
			container = plugin.createSpriteContainers({ effect, container });
		}
		return container
	}

	static createSprite({ effect }={}) {
		for(const plugin of this.plugins){
			plugin.createSprite({ effect })
		}
	}

	static masking({ effect, doc, obj, shape }={}) {
		for(const plugin of this.plugins){
			shape = plugin.masking({ effect, doc, obj, shape })
		}
		return shape;
	}

	static get maskingHooks() {
		let hooks = [];
		for(const plugin of this.plugins){
			hooks = hooks.concat(plugin.maskingHooks)
		}
		return hooks;
	}
}


export default PluginsManager;