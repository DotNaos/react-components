import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const reactUiPath = process.env.REACT_UI_PATH
  ? path.resolve(repoRoot, process.env.REACT_UI_PATH)
  : null;
const useReactUiSourceAlias =
  reactUiPath !== null &&
  fs.existsSync(path.join(reactUiPath, "package.json")) &&
  fs.existsSync(path.join(reactUiPath, "src/index.ts"));

const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-docs"],
  framework: "@storybook/react-vite",
  staticDirs: ["../public"],
  viteFinal: async (config) => {
    config.plugins = [...(config.plugins ?? []), tailwindcss()];
    config.base = process.env.STORYBOOK_BASE_PATH ?? config.base;
    if (useReactUiSourceAlias && reactUiPath !== null) {
      config.server = config.server ?? {};
      config.server.fs = config.server.fs ?? {};
      config.server.fs.allow = [
        ...(config.server.fs.allow ?? []),
        reactUiPath,
      ];
      config.resolve = config.resolve ?? {};
      config.resolve.alias = [
        {
          find: "@dotnaos/react-ui/tokens.css",
          replacement: path.resolve(reactUiPath, "src/tokens.css"),
        },
        {
          find: "@dotnaos/react-ui/tailwind-theme.css",
          replacement: path.resolve(reactUiPath, "src/tailwind-theme.css"),
        },
        {
          find: "@dotnaos/react-ui/styles.css",
          replacement: path.resolve(reactUiPath, "src/styles.css"),
        },
        {
          find: "@dotnaos/react-ui/shadcn",
          replacement: path.resolve(reactUiPath, "src/shadcn/index.ts"),
        },
        {
          find: "@dotnaos/react-ui",
          replacement: path.resolve(reactUiPath, "src/index.ts"),
        },
        ...(Array.isArray(config.resolve.alias)
          ? config.resolve.alias
          : Object.entries(config.resolve.alias ?? {}).map(
              ([find, replacement]) => ({ find, replacement }),
            )),
      ];
    }
    return config;
  },
};

export default config;
