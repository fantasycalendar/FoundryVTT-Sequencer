// vite.config.mjs
import { svelte } from "file:///C:/Users/adam_/Desktop/FoundryVTT-Scripts/FoundryVTT-Sequencer/node_modules/@sveltejs/vite-plugin-svelte/dist/index.js";
import resolve from "file:///C:/Users/adam_/Desktop/FoundryVTT-Scripts/FoundryVTT-Sequencer/node_modules/@rollup/plugin-node-resolve/dist/es/index.js";
import preprocess from "file:///C:/Users/adam_/Desktop/FoundryVTT-Scripts/FoundryVTT-Sequencer/node_modules/svelte-preprocess/dist/index.js";
import { postcssConfig, terserConfig } from "file:///C:/Users/adam_/Desktop/FoundryVTT-Scripts/FoundryVTT-Sequencer/node_modules/@typhonjs-fvtt/runtime/.rollup/remote/index.js";
var __vite_injected_original_dirname = "C:\\Users\\adam_\\Desktop\\FoundryVTT-Scripts\\FoundryVTT-Sequencer";
var s_PACKAGE_ID = "modules/sequencer";
var s_SVELTE_HASH_ID = "ese";
var s_COMPRESS = false;
var s_SOURCEMAPS = true;
var s_RESOLVE_CONFIG = {
  browser: false,
  dedupe: ["svelte"]
};
var vite_config_default = () => {
  return {
    root: "src/",
    // Source location / esbuild root.
    base: `/${s_PACKAGE_ID}/`,
    // Base module path that 30001 / served dev directory.
    publicDir: false,
    // No public resources to copy.
    cacheDir: "../.vite-cache",
    // Relative from root directory.
    resolve: { conditions: ["import", "browser"] },
    esbuild: {
      target: ["es2022"]
    },
    css: {
      // Creates a standard configuration for PostCSS with autoprefixer & postcss-preset-env.
      postcss: postcssConfig({ compress: s_COMPRESS, sourceMap: s_SOURCEMAPS })
    },
    // About server options:
    // - Set to `open` to boolean `false` to not open a browser window automatically. This is useful if you set up a
    // debugger instance in your IDE and launch it with the URL: 'http://localhost:30001/game'.
    //
    // - The top proxy entry redirects requests under the module path for `style.css` and following standard static
    // directories: `assets`, `lang`, and `packs` and will pull those resources from the main Foundry / 30000 server.
    // This is necessary to reference the dev resources as the root is `/src` and there is no public / static
    // resources served with this particular Vite configuration. Modify the proxy rule as necessary for your
    // static resources / project.
    server: {
      port: 29999,
      open: "/game",
      proxy: {
        // Serves static files from main Foundry server.
        [`^(/${s_PACKAGE_ID}/(assets|lang|packs|style.css))`]: "http://localhost:30000",
        // All other paths besides package ID path are served from main Foundry server.
        [`^(?!/${s_PACKAGE_ID}/)`]: "http://localhost:30000",
        // Enable socket.io from main Foundry server.
        "/socket.io": { target: "ws://localhost:30000", ws: true }
      }
    },
    build: {
      outDir: __vite_injected_original_dirname,
      emptyOutDir: false,
      sourcemap: s_SOURCEMAPS,
      brotliSize: true,
      minify: s_COMPRESS ? "terser" : false,
      target: ["es2022"],
      terserOptions: s_COMPRESS ? { ...terserConfig(), ecma: 2022 } : void 0,
      lib: {
        entry: "./module.js",
        formats: ["es"],
        fileName: "module"
      }
    },
    plugins: [
      svelte({
        compilerOptions: {
          // Provides a custom hash adding the string defined in `s_SVELTE_HASH_ID` to scoped Svelte styles;
          // This is reasonable to do as the framework styles in TRL compiled across `n` different packages will
          // be the same. Slightly modifying the hash ensures that your package has uniquely scoped styles for all
          // TRL components and makes it easier to review styles in the browser debugger.
          cssHash: ({ hash, css }) => `svelte-${s_SVELTE_HASH_ID}-${hash(css)}`
        },
        preprocess: preprocess()
      }),
      resolve(s_RESOLVE_CONFIG)
      // Necessary when bundling npm-linked packages.
    ]
  };
};
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcubWpzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcYWRhbV9cXFxcRGVza3RvcFxcXFxGb3VuZHJ5VlRULVNjcmlwdHNcXFxcRm91bmRyeVZUVC1TZXF1ZW5jZXJcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXGFkYW1fXFxcXERlc2t0b3BcXFxcRm91bmRyeVZUVC1TY3JpcHRzXFxcXEZvdW5kcnlWVFQtU2VxdWVuY2VyXFxcXHZpdGUuY29uZmlnLm1qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvYWRhbV8vRGVza3RvcC9Gb3VuZHJ5VlRULVNjcmlwdHMvRm91bmRyeVZUVC1TZXF1ZW5jZXIvdml0ZS5jb25maWcubWpzXCI7aW1wb3J0IHsgc3ZlbHRlIH0gZnJvbSBcIkBzdmVsdGVqcy92aXRlLXBsdWdpbi1zdmVsdGVcIjtcbmltcG9ydCByZXNvbHZlIGZyb20gXCJAcm9sbHVwL3BsdWdpbi1ub2RlLXJlc29sdmVcIjsgLy8gVGhpcyByZXNvbHZlcyBOUE0gbW9kdWxlcyBmcm9tIG5vZGVfbW9kdWxlcy5cbmltcG9ydCBwcmVwcm9jZXNzIGZyb20gXCJzdmVsdGUtcHJlcHJvY2Vzc1wiO1xuaW1wb3J0IHsgcG9zdGNzc0NvbmZpZywgdGVyc2VyQ29uZmlnIH0gZnJvbSBcIkB0eXBob25qcy1mdnR0L3J1bnRpbWUvcm9sbHVwXCI7XG5cbi8vIEFUVEVOVElPTiFcbi8vIFBsZWFzZSBtb2RpZnkgdGhlIGJlbG93IHZhcmlhYmxlczogc19QQUNLQUdFX0lEIGFuZCBzX1NWRUxURV9IQVNIX0lEIGFwcHJvcHJpYXRlbHkuXG5cbi8vIEZvciBjb252ZW5pZW5jZSwgeW91IGp1c3QgbmVlZCB0byBtb2RpZnkgdGhlIHBhY2thZ2UgSUQgYmVsb3cgYXMgaXQgaXMgdXNlZCB0byBmaWxsIGluIGRlZmF1bHQgcHJveHkgc2V0dGluZ3MgZm9yXG4vLyB0aGUgZGV2IHNlcnZlci5cbmNvbnN0IHNfUEFDS0FHRV9JRCA9IFwibW9kdWxlcy9zZXF1ZW5jZXJcIjtcblxuLy8gQSBzaG9ydCBhZGRpdGlvbmFsIHN0cmluZyB0byBhZGQgdG8gU3ZlbHRlIENTUyBoYXNoIHZhbHVlcyB0byBtYWtlIHlvdXJzIHVuaXF1ZS4gVGhpcyByZWR1Y2VzIHRoZSBhbW91bnQgb2Zcbi8vIGR1cGxpY2F0ZWQgZnJhbWV3b3JrIENTUyBvdmVybGFwIGJldHdlZW4gbWFueSBUUkwgcGFja2FnZXMgZW5hYmxlZCBvbiBGb3VuZHJ5IFZUVCBhdCB0aGUgc2FtZSB0aW1lLiAnZXNlJyBpcyBjaG9zZW5cbi8vIGJ5IHNob3J0ZW5pbmcgJ2Vzc2VudGlhbC1zdmVsdGUtZXNtJy5cbmNvbnN0IHNfU1ZFTFRFX0hBU0hfSUQgPSBcImVzZVwiO1xuXG5jb25zdCBzX0NPTVBSRVNTID0gZmFsc2U7IC8vIFNldCB0byB0cnVlIHRvIGNvbXByZXNzIHRoZSBtb2R1bGUgYnVuZGxlLlxuY29uc3Qgc19TT1VSQ0VNQVBTID0gdHJ1ZTsgLy8gR2VuZXJhdGUgc291cmNlbWFwcyBmb3IgdGhlIGJ1bmRsZSAocmVjb21tZW5kZWQpLlxuXG4vLyBVc2VkIGluIGJ1bmRsaW5nIHBhcnRpY3VsYXJseSBkdXJpbmcgZGV2ZWxvcG1lbnQuIElmIHlvdSBucG0tbGluayBwYWNrYWdlcyB0byB5b3VyIHByb2plY3QgYWRkIHRoZW0gaGVyZS5cbmNvbnN0IHNfUkVTT0xWRV9DT05GSUcgPSB7XG4gIGJyb3dzZXI6IGZhbHNlLFxuICBkZWR1cGU6IFtcInN2ZWx0ZVwiXSxcbn07XG5cbmV4cG9ydCBkZWZhdWx0ICgpID0+IHtcbiAgLyoqIEB0eXBlIHtpbXBvcnQoJ3ZpdGUnKS5Vc2VyQ29uZmlnfSAqL1xuICByZXR1cm4ge1xuICAgIHJvb3Q6IFwic3JjL1wiLCAvLyBTb3VyY2UgbG9jYXRpb24gLyBlc2J1aWxkIHJvb3QuXG4gICAgYmFzZTogYC8ke3NfUEFDS0FHRV9JRH0vYCwgLy8gQmFzZSBtb2R1bGUgcGF0aCB0aGF0IDMwMDAxIC8gc2VydmVkIGRldiBkaXJlY3RvcnkuXG4gICAgcHVibGljRGlyOiBmYWxzZSwgLy8gTm8gcHVibGljIHJlc291cmNlcyB0byBjb3B5LlxuICAgIGNhY2hlRGlyOiBcIi4uLy52aXRlLWNhY2hlXCIsIC8vIFJlbGF0aXZlIGZyb20gcm9vdCBkaXJlY3RvcnkuXG5cbiAgICByZXNvbHZlOiB7IGNvbmRpdGlvbnM6IFtcImltcG9ydFwiLCBcImJyb3dzZXJcIl0gfSxcblxuICAgIGVzYnVpbGQ6IHtcbiAgICAgIHRhcmdldDogW1wiZXMyMDIyXCJdLFxuICAgIH0sXG5cbiAgICBjc3M6IHtcbiAgICAgIC8vIENyZWF0ZXMgYSBzdGFuZGFyZCBjb25maWd1cmF0aW9uIGZvciBQb3N0Q1NTIHdpdGggYXV0b3ByZWZpeGVyICYgcG9zdGNzcy1wcmVzZXQtZW52LlxuICAgICAgcG9zdGNzczogcG9zdGNzc0NvbmZpZyh7IGNvbXByZXNzOiBzX0NPTVBSRVNTLCBzb3VyY2VNYXA6IHNfU09VUkNFTUFQUyB9KSxcbiAgICB9LFxuXG4gICAgLy8gQWJvdXQgc2VydmVyIG9wdGlvbnM6XG4gICAgLy8gLSBTZXQgdG8gYG9wZW5gIHRvIGJvb2xlYW4gYGZhbHNlYCB0byBub3Qgb3BlbiBhIGJyb3dzZXIgd2luZG93IGF1dG9tYXRpY2FsbHkuIFRoaXMgaXMgdXNlZnVsIGlmIHlvdSBzZXQgdXAgYVxuICAgIC8vIGRlYnVnZ2VyIGluc3RhbmNlIGluIHlvdXIgSURFIGFuZCBsYXVuY2ggaXQgd2l0aCB0aGUgVVJMOiAnaHR0cDovL2xvY2FsaG9zdDozMDAwMS9nYW1lJy5cbiAgICAvL1xuICAgIC8vIC0gVGhlIHRvcCBwcm94eSBlbnRyeSByZWRpcmVjdHMgcmVxdWVzdHMgdW5kZXIgdGhlIG1vZHVsZSBwYXRoIGZvciBgc3R5bGUuY3NzYCBhbmQgZm9sbG93aW5nIHN0YW5kYXJkIHN0YXRpY1xuICAgIC8vIGRpcmVjdG9yaWVzOiBgYXNzZXRzYCwgYGxhbmdgLCBhbmQgYHBhY2tzYCBhbmQgd2lsbCBwdWxsIHRob3NlIHJlc291cmNlcyBmcm9tIHRoZSBtYWluIEZvdW5kcnkgLyAzMDAwMCBzZXJ2ZXIuXG4gICAgLy8gVGhpcyBpcyBuZWNlc3NhcnkgdG8gcmVmZXJlbmNlIHRoZSBkZXYgcmVzb3VyY2VzIGFzIHRoZSByb290IGlzIGAvc3JjYCBhbmQgdGhlcmUgaXMgbm8gcHVibGljIC8gc3RhdGljXG4gICAgLy8gcmVzb3VyY2VzIHNlcnZlZCB3aXRoIHRoaXMgcGFydGljdWxhciBWaXRlIGNvbmZpZ3VyYXRpb24uIE1vZGlmeSB0aGUgcHJveHkgcnVsZSBhcyBuZWNlc3NhcnkgZm9yIHlvdXJcbiAgICAvLyBzdGF0aWMgcmVzb3VyY2VzIC8gcHJvamVjdC5cbiAgICBzZXJ2ZXI6IHtcbiAgICAgIHBvcnQ6IDI5OTk5LFxuICAgICAgb3BlbjogXCIvZ2FtZVwiLFxuICAgICAgcHJveHk6IHtcbiAgICAgICAgLy8gU2VydmVzIHN0YXRpYyBmaWxlcyBmcm9tIG1haW4gRm91bmRyeSBzZXJ2ZXIuXG4gICAgICAgIFtgXigvJHtzX1BBQ0tBR0VfSUR9Lyhhc3NldHN8bGFuZ3xwYWNrc3xzdHlsZS5jc3MpKWBdOlxuICAgICAgICAgIFwiaHR0cDovL2xvY2FsaG9zdDozMDAwMFwiLFxuXG4gICAgICAgIC8vIEFsbCBvdGhlciBwYXRocyBiZXNpZGVzIHBhY2thZ2UgSUQgcGF0aCBhcmUgc2VydmVkIGZyb20gbWFpbiBGb3VuZHJ5IHNlcnZlci5cbiAgICAgICAgW2BeKD8hLyR7c19QQUNLQUdFX0lEfS8pYF06IFwiaHR0cDovL2xvY2FsaG9zdDozMDAwMFwiLFxuXG4gICAgICAgIC8vIEVuYWJsZSBzb2NrZXQuaW8gZnJvbSBtYWluIEZvdW5kcnkgc2VydmVyLlxuICAgICAgICBcIi9zb2NrZXQuaW9cIjogeyB0YXJnZXQ6IFwid3M6Ly9sb2NhbGhvc3Q6MzAwMDBcIiwgd3M6IHRydWUgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgICBidWlsZDoge1xuICAgICAgb3V0RGlyOiBfX2Rpcm5hbWUsXG4gICAgICBlbXB0eU91dERpcjogZmFsc2UsXG4gICAgICBzb3VyY2VtYXA6IHNfU09VUkNFTUFQUyxcbiAgICAgIGJyb3RsaVNpemU6IHRydWUsXG4gICAgICBtaW5pZnk6IHNfQ09NUFJFU1MgPyBcInRlcnNlclwiIDogZmFsc2UsXG4gICAgICB0YXJnZXQ6IFtcImVzMjAyMlwiXSxcbiAgICAgIHRlcnNlck9wdGlvbnM6IHNfQ09NUFJFU1MgPyB7IC4uLnRlcnNlckNvbmZpZygpLCBlY21hOiAyMDIyIH0gOiB2b2lkIDAsXG4gICAgICBsaWI6IHtcbiAgICAgICAgZW50cnk6IFwiLi9tb2R1bGUuanNcIixcbiAgICAgICAgZm9ybWF0czogW1wiZXNcIl0sXG4gICAgICAgIGZpbGVOYW1lOiBcIm1vZHVsZVwiLFxuICAgICAgfSxcbiAgICB9LFxuXG4gICAgcGx1Z2luczogW1xuICAgICAgc3ZlbHRlKHtcbiAgICAgICAgY29tcGlsZXJPcHRpb25zOiB7XG4gICAgICAgICAgLy8gUHJvdmlkZXMgYSBjdXN0b20gaGFzaCBhZGRpbmcgdGhlIHN0cmluZyBkZWZpbmVkIGluIGBzX1NWRUxURV9IQVNIX0lEYCB0byBzY29wZWQgU3ZlbHRlIHN0eWxlcztcbiAgICAgICAgICAvLyBUaGlzIGlzIHJlYXNvbmFibGUgdG8gZG8gYXMgdGhlIGZyYW1ld29yayBzdHlsZXMgaW4gVFJMIGNvbXBpbGVkIGFjcm9zcyBgbmAgZGlmZmVyZW50IHBhY2thZ2VzIHdpbGxcbiAgICAgICAgICAvLyBiZSB0aGUgc2FtZS4gU2xpZ2h0bHkgbW9kaWZ5aW5nIHRoZSBoYXNoIGVuc3VyZXMgdGhhdCB5b3VyIHBhY2thZ2UgaGFzIHVuaXF1ZWx5IHNjb3BlZCBzdHlsZXMgZm9yIGFsbFxuICAgICAgICAgIC8vIFRSTCBjb21wb25lbnRzIGFuZCBtYWtlcyBpdCBlYXNpZXIgdG8gcmV2aWV3IHN0eWxlcyBpbiB0aGUgYnJvd3NlciBkZWJ1Z2dlci5cbiAgICAgICAgICBjc3NIYXNoOiAoeyBoYXNoLCBjc3MgfSkgPT4gYHN2ZWx0ZS0ke3NfU1ZFTFRFX0hBU0hfSUR9LSR7aGFzaChjc3MpfWAsXG4gICAgICAgIH0sXG4gICAgICAgIHByZXByb2Nlc3M6IHByZXByb2Nlc3MoKSxcbiAgICAgIH0pLFxuXG4gICAgICByZXNvbHZlKHNfUkVTT0xWRV9DT05GSUcpLCAvLyBOZWNlc3Nhcnkgd2hlbiBidW5kbGluZyBucG0tbGlua2VkIHBhY2thZ2VzLlxuICAgIF0sXG4gIH07XG59O1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUEwWCxTQUFTLGNBQWM7QUFDalosT0FBTyxhQUFhO0FBQ3BCLE9BQU8sZ0JBQWdCO0FBQ3ZCLFNBQVMsZUFBZSxvQkFBb0I7QUFINUMsSUFBTSxtQ0FBbUM7QUFVekMsSUFBTSxlQUFlO0FBS3JCLElBQU0sbUJBQW1CO0FBRXpCLElBQU0sYUFBYTtBQUNuQixJQUFNLGVBQWU7QUFHckIsSUFBTSxtQkFBbUI7QUFBQSxFQUN2QixTQUFTO0FBQUEsRUFDVCxRQUFRLENBQUMsUUFBUTtBQUNuQjtBQUVBLElBQU8sc0JBQVEsTUFBTTtBQUVuQixTQUFPO0FBQUEsSUFDTCxNQUFNO0FBQUE7QUFBQSxJQUNOLE1BQU0sSUFBSTtBQUFBO0FBQUEsSUFDVixXQUFXO0FBQUE7QUFBQSxJQUNYLFVBQVU7QUFBQTtBQUFBLElBRVYsU0FBUyxFQUFFLFlBQVksQ0FBQyxVQUFVLFNBQVMsRUFBRTtBQUFBLElBRTdDLFNBQVM7QUFBQSxNQUNQLFFBQVEsQ0FBQyxRQUFRO0FBQUEsSUFDbkI7QUFBQSxJQUVBLEtBQUs7QUFBQTtBQUFBLE1BRUgsU0FBUyxjQUFjLEVBQUUsVUFBVSxZQUFZLFdBQVcsYUFBYSxDQUFDO0FBQUEsSUFDMUU7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxJQVdBLFFBQVE7QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLE9BQU87QUFBQTtBQUFBLFFBRUwsQ0FBQyxNQUFNLDZDQUE2QyxHQUNsRDtBQUFBO0FBQUEsUUFHRixDQUFDLFFBQVEsZ0JBQWdCLEdBQUc7QUFBQTtBQUFBLFFBRzVCLGNBQWMsRUFBRSxRQUFRLHdCQUF3QixJQUFJLEtBQUs7QUFBQSxNQUMzRDtBQUFBLElBQ0Y7QUFBQSxJQUNBLE9BQU87QUFBQSxNQUNMLFFBQVE7QUFBQSxNQUNSLGFBQWE7QUFBQSxNQUNiLFdBQVc7QUFBQSxNQUNYLFlBQVk7QUFBQSxNQUNaLFFBQVEsYUFBYSxXQUFXO0FBQUEsTUFDaEMsUUFBUSxDQUFDLFFBQVE7QUFBQSxNQUNqQixlQUFlLGFBQWEsRUFBRSxHQUFHLGFBQWEsR0FBRyxNQUFNLEtBQUssSUFBSTtBQUFBLE1BQ2hFLEtBQUs7QUFBQSxRQUNILE9BQU87QUFBQSxRQUNQLFNBQVMsQ0FBQyxJQUFJO0FBQUEsUUFDZCxVQUFVO0FBQUEsTUFDWjtBQUFBLElBQ0Y7QUFBQSxJQUVBLFNBQVM7QUFBQSxNQUNQLE9BQU87QUFBQSxRQUNMLGlCQUFpQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsVUFLZixTQUFTLENBQUMsRUFBRSxNQUFNLElBQUksTUFBTSxVQUFVLG9CQUFvQixLQUFLLEdBQUc7QUFBQSxRQUNwRTtBQUFBLFFBQ0EsWUFBWSxXQUFXO0FBQUEsTUFDekIsQ0FBQztBQUFBLE1BRUQsUUFBUSxnQkFBZ0I7QUFBQTtBQUFBLElBQzFCO0FBQUEsRUFDRjtBQUNGOyIsCiAgIm5hbWVzIjogW10KfQo=
