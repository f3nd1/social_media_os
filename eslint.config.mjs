import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [".next/**", "next-env.d.ts", "node_modules/**"],
  },
  {
    rules: {
      // An underscore prefix marks a binding that exists on purpose but is not
      // read. The case that matters here is destructuring a key out of an
      // object to omit it, as sanitizeCalendarPatch does with approvalStage to
      // stop a compliance-blocked item advancing. Warning on that invites
      // someone to "fix" it by deleting the binding, which would silently
      // reopen the gate.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
];

export default eslintConfig;
