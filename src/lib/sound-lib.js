import { clamp } from "./lib.js";

export function smoothstep(edge_0, edge_1, value) {
	const t = clamp((value - edge_0) / (edge_1 - edge_0), 0, 1);
	return t * t * (3 - 2 * t);
}

export function ease_pan_value(pan_value, power) {
	const sign = Math.sign(pan_value);
	const absolute_value = Math.min(1, Math.abs(pan_value));
	return sign * Math.pow(absolute_value, power);
}

export function calculate_pan_factor(ray_distance_pixels, inner_radius_pixels, outer_radius_pixels) {
	if ((inner_radius_pixels > 0 && ray_distance_pixels <= inner_radius_pixels) || outer_radius_pixels <= inner_radius_pixels) {
		return 0;
	}
	const t = (ray_distance_pixels - inner_radius_pixels) / (outer_radius_pixels - inner_radius_pixels);
	return smoothstep(0, 1, t);
}