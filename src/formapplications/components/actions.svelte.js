export function applyStyles(node, data) {
	// the node has been mounted in the DOM

	$effect(() => {
		// setup goes here

		let existingStyle = node.getAttribute('style') || '';
		let existingStyleObj = {};

		if (existingStyle) {
			existingStyleObj = Object.fromEntries(
				existingStyle.split(';')
					.filter(style => style.trim())
					.map(style => {
						const [key, value] = style.split(':');
						return [key.trim(), value.trim()];
					})
			);
		}

		const mergedStyles = { ...existingStyleObj, ...data };

		let styles = Object.entries(mergedStyles)
			.map(([key, value]) => `${key}: ${value};`)
			.join('');

		node.setAttribute('style', styles);

		return () => {
			const currentStyle = node.getAttribute('style') || '';
			const currentStyleObj = Object.fromEntries(
				currentStyle.split(';')
					.filter(style => style.trim())
					.map(style => {
						const [key, value] = style.split(':');
						return [key.trim(), value.trim()];
					})
			);

			Object.keys(data).forEach(key => delete currentStyleObj[key]);

			const cleanedStyles = Object.entries(currentStyleObj)
				.map(([key, value]) => `${key}: ${value};`)
				.join('');

			node.setAttribute('style', cleanedStyles);
		};
	});
}