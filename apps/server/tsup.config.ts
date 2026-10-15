import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  platform: "node",
  target: "node22",
  clean: true,
  sourcemap: true,
  // Workspace packages ship TypeScript source, so they must be bundled in.
  noExternal: [/^@droid247\//],
});
