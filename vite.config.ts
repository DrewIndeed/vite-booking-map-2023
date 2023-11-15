import terser from "@rollup/plugin-terser";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { defineConfig } from "vite";
import { chunkSplitPlugin } from "vite-plugin-chunk-split";
import { compression as viteCompression } from "vite-plugin-compression2";
import svgr from "vite-plugin-svgr";

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "@components": path.resolve(__dirname, "./src/components"),
      "@store": path.resolve(__dirname, "./src/store"),
      "@lib": path.resolve(__dirname, "./src/lib"),
      "@style": path.resolve(__dirname, "./src/style"),
      "@icons": path.resolve(__dirname, "./src/icons/index.ts"),
    },
  },
  server: {
    port: 6789,
  },
  preview: {
    port: 6789,
  },
  plugins: [
    react(),
    svgr(),
    terser(),
    chunkSplitPlugin({
      strategy: "unbundle",
    }),
    viteCompression({
      algorithm: "brotliCompress",
      exclude: [/\.(br)$/, /\.(gz)$/],
    }),
  ],
  build: {
    minify: "terser",
    sourcemap: false,
    cssCodeSplit: true,
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: undefined,
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          "react-konva": "ReactKonva",
        },
      },
    },
  },
});
