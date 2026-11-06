import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // The domain layer is pure TypeScript shared by the backend and the UI.
    files: ["src/domain/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: ["react", "react-dom", "next"],
          patterns: [
            {
              group: ["next/*", "node:*", "@/components/*"],
              message: "src/domain must stay framework-free.",
            },
          ],
        },
      ],
      "no-restricted-properties": [
        "error",
        { object: "Date", property: "now", message: "Inject the current time instead." },
        { object: "Math", property: "random", message: "Use the seeded PRNG instead." },
      ],
    },
  },
  {
    // The server layer (DB, repositories, services, HTTP helpers) never renders UI.
    files: ["src/server/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: ["react", "react-dom"],
          patterns: [
            { group: ["react/*", "react-dom/*"], message: "src/server must not depend on React." },
            { group: ["@/components/*"], message: "src/server must not import UI components." },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
