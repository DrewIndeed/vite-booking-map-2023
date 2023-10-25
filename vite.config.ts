import terser from "@rollup/plugin-terser";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { defineConfig } from "vite";
import { chunkSplitPlugin } from "vite-plugin-chunk-split";
import { compression as viteCompression } from "vite-plugin-compression2";

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "@components": path.resolve(__dirname, "./src/components"),
      "@store": path.resolve(__dirname, "./src/store"),
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
    terser(),
    chunkSplitPlugin({
      strategy: "unbundle",
      customSplitting: {
        app: [/src\/components\/App/],
      },
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
