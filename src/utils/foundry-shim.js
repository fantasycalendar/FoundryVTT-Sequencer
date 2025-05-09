import CONSTANTS from "../constants.js";

export default {
	PlaceableObject: CONSTANTS.IS_V13 ? foundry.canvas.placeables.PlaceableObject : PlaceableObject,
	Token: CONSTANTS.IS_V13 ? foundry.canvas.placeables.Token : Token,
	MeasuredTemplate: CONSTANTS.IS_V13 ? foundry.canvas.placeables.MeasuredTemplate : MeasuredTemplate,
	Drawing: CONSTANTS.IS_V13 ? foundry.canvas.placeables.Drawing : Drawing,
	Tile: CONSTANTS.IS_V13 ? foundry.canvas.placeables.Tile : Tile,
	SpriteMesh: CONSTANTS.IS_V13 ? foundry.canvas.containers.SpriteMesh : SpriteMesh,
	InteractionLayer: CONSTANTS.IS_V13 ? foundry.canvas.layers.InteractionLayer : InteractionLayer,
	srcExists: CONSTANTS.IS_V13 ? foundry.canvas.srcExists : srcExists,
	loadTexture: CONSTANTS.IS_V13 ? foundry.canvas.loadTexture : loadTexture,
	BatchShaderGenerator: CONSTANTS.IS_V13 ? foundry.canvas.rendering.batching.BatchShaderGenerator : BatchShaderGenerator,
	BaseSamplerShader: CONSTANTS.IS_V13 ? foundry.canvas.rendering.shaders.BaseSamplerShader : BaseSamplerShader,
	AbstractBaseFilter: CONSTANTS.IS_V13 ? foundry.canvas.rendering.filters.AbstractBaseFilter : AbstractBaseFilter,
	CanvasAnimation: CONSTANTS.IS_V13 ? foundry.canvas.animation.CanvasAnimation : CanvasAnimation,
	Canvas: CONSTANTS.IS_V13 ? foundry.canvas.Canvas : Canvas,
}