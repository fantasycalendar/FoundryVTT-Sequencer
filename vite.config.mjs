import { existsSync, mkdir, writeFileSync } from "node:fs";
import path from "node:path";
import { svelte, vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import autoprefixer from "autoprefixer";
import postcssPresetEnv from "postcss-preset-env";
import { sveltePreprocess } from "svelte-preprocess";
import { defineConfig } from "vite";
import lucidePreprocess from "vite-plugin-lucide-preprocess";
import moduleJSON from "./module.json";

const modulePath = `modules/${moduleJSON.id}`;
const port = 30000; // Port where Foundry is running.
const devPort = 29999; // Port where this vite server runs. Maybe just make it port + 1?
const entry = "module.js"; // Which src file to serve as entrypoint.

const postcss = {
	inject: false,
	sourceMap: true,
	extensions: [".css"],
	plugins: [
		autoprefixer,
		postcssPresetEnv
	],
};

export default defineConfig(({ mode }) => {
	return {
		root: "src/", // Source location / esbuild root.
		sourceCodeDir: "src/",
		base: `/${modulePath}/dist`, // Base module path that 30001 / served dev directory.
		publicDir: false, // No public resources to copy.
		cacheDir: "../.vite-cache", // Relative from root directory.

		resolve: {
			conditions: ["browser", "import"],
			alias: {
				moduleJSON: path.resolve(__dirname, "./module.json"),
			},
		},

		esbuild: {
			target: ["es2023"],
		},

		css: { postcss },

		server: {
			open: "/join",
			port: devPort,
			proxy: {
				// Serves static files from main Foundry server.
				[`^(/${modulePath}/(languages))`]: `http://localhost:${port}`,

				// All other paths besides package ID path are served from main Foundry server.
				[`^(?!/${modulePath}/)`]: `http://localhost:${port}`,

				// Rewrite incoming `module-id.js` request from Foundry to the dev server `index.ts`.
				[`/${modulePath}/dist/${moduleJSON.id}.js`]: {
					target: `http://localhost:${devPort}/${modulePath}/dist`,
					rewrite: () => `/${entry}`,
				},

				// Enable socket.io from main Foundry server.
				"/socket.io": { target: `ws://localhost:${port}`, ws: true },
			},
		},
		build: {
			outDir: "../dist",
			emptyOutDir: false,
			sourcemap: true,
			minify: "terser",
			target: ["es2023"],
			terserOptions: {
				compress: {
					passes: 3,
				},
				mangle: {
					toplevel: true,
					keep_classnames: true,
					keep_fnames: true,
				},
				module: true,
				ecma: 2020,
			},
			lib: {
				entry,
				formats: ["es"],
				fileName: moduleJSON.id,
			},
			rollupOptions: {
				output: {
					// Rewrite the default style.css to a more recognizable file name.
					assetFileNames: assetInfo =>
						assetInfo.name === "style.css" ? `${moduleJSON.id}.css` : assetInfo.name,
				},
			},
		},

		optimizeDeps: {
			esbuildOptions: {
				target: "es2023",
			},
		},

		plugins: [
			svelte({
				compilerOptions: {
					// customElement: true,
					cssHash: mode === "production" ? ({
						hash,
						css
					}) => `svelte-${moduleJSON.flags.css.shorthand}-${hash(css)}` : undefined,
				},
				preprocess: sveltePreprocess()
			}),
			{
				name: "create-dist-files",
				apply: "serve",
				buildStart() {
					if (!existsSync("dist")) {
						mkdir("dist", (err) => {
							if (err) throw err;
						});
					}

					const files = [...moduleJSON.esmodules, ...moduleJSON.styles];
					for (const name of files) {
						writeFileSync(name, "", { flag: "a" });
					}
				},
			},
		],
	};
});