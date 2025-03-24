/* eslint-env node */
import { svelte } from '@sveltejs/vite-plugin-svelte';

import {
	postcssConfig,
	terserConfig
} from '@typhonjs-fvtt/runtime/rollup';

import { sveltePreprocess } from 'svelte-preprocess';

import moduleJSON from './module.json' with { type: 'json' };

// ATTENTION!
// Please modify the below variables: s_PACKAGE_ID and s_SVELTE_HASH_ID appropriately.

const s_PACKAGE_ID = `modules/${moduleJSON.id}`;

// A short additional string to add to Svelte CSS hash values to make yours unique. This reduces the amount of
// duplicated framework CSS overlap between many TRL packages enabled on Foundry VTT at the same time. 'tse' is chosen
// by shortening 'template-svelte-esm'.
const s_SVELTE_HASH_ID = 'ip';

const s_COMPRESS = false;  // Set to true to compress the module bundle.
const s_SOURCEMAPS = true; // Generate sourcemaps for the bundle (recommended).

export default ({ mode }) => {
	// Provides a custom hash adding the string defined in `s_SVELTE_HASH_ID` to scoped Svelte styles;
	// This is reasonable to do as the framework styles in TRL compiled across `n` different packages will
	// be the same. Slightly modifying the hash ensures that your package has uniquely scoped styles for all
	// TRL components and makes it easier to review styles in the browser debugger.
	const compilerOptions = mode === 'production' ? {
		cssHash: ({ hash, css }) => `svelte-${s_SVELTE_HASH_ID}-${hash(css)}`
	} : {};

	/** @type {import('vite').UserConfig} */
	return {
		root: 'src/',                    // Source location / esbuild root.
		base: `/${s_PACKAGE_ID}/dist`,   // Base module path that 29999 / served dev directory.
		publicDir: false,                // No public resources to copy.
		cacheDir: '../.vite-cache',      // Relative from root directory.

		resolve: {
			conditions: ['browser', 'import']
		},

		esbuild: {
			target: ['es2022']
		},

		css: {
			// Creates a standard configuration for PostCSS with autoprefixer & postcss-preset-env.
			postcss: postcssConfig({ compress: s_COMPRESS, sourceMap: s_SOURCEMAPS })
		},

		// About server options:
		// - Set to `open` to boolean `false` to not open a browser window automatically. This is useful if you set up a
		// debugger instance in your IDE and launch it with the URL: 'http://localhost:29999/game'.
		//
		// - The top proxy entry redirects requests under the module path for `style.css` and following standard static
		// directories: `assets`, `lang`, and `packs` and will pull those resources from the main Foundry / 30000 server.
		// This is necessary to reference the dev resources as the root is `/src` and there is no public / static
		// resources served with this particular Vite configuration. Modify the proxy rule as necessary for your
		// static resources / project.
		server: {
			port: 29999,
			open: '/game',
			proxy: {
				// Serves static files from main Foundry server.
				[`^(/${s_PACKAGE_ID}/(assets|lang|packs|dist/${moduleJSON.id}.css))`]: 'http://localhost:30000',

				// All other paths besides package ID path are served from main Foundry server.
				[`^(?!/${s_PACKAGE_ID}/)`]: 'http://localhost:30000',

				// Rewrite incoming `module-id.js` request from Foundry to the dev server `module.js`.
				[`/${s_PACKAGE_ID}/dist/${moduleJSON.id}.js`]: {
					target: `http://localhost:29999/${s_PACKAGE_ID}/dist`,
					rewrite: () => '/module.js',
				},

				// Enable socket.io from main Foundry server.
				'/socket.io': { target: 'ws://localhost:30000', ws: true }
			}
		},

		build: {
			outDir: '../dist',
			emptyOutDir: false,
			sourcemap: s_SOURCEMAPS,
			brotliSize: true,
			minify: s_COMPRESS ? 'terser' : false,
			target: ['es2022'],
			terserOptions: s_COMPRESS ? { ...terserConfig(), ecma: 2022 } : void 0,
			lib: {
				entry: './module.js',
				formats: ['es'],
				fileName: moduleJSON.id
			},
			rollupOptions: {
				output: {
					// Rewrite the default style.css to a more recognizable file name.
					assetFileNames: (assetInfo) =>
						assetInfo.name === 'style.css' ? `${moduleJSON.id}.css` : assetInfo.name,
				},
			}
		},

		// Necessary when using the dev server for top-level await usage inside TRL.
		optimizeDeps: {
			esbuildOptions: {
				target: 'es2022'
			}
		},

		plugins: [
			svelte({
				compilerOptions,
				preprocess: sveltePreprocess()
			})
		]
	};
};
