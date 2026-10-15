# GraphQL Schema to TypeScript + Zod Converter

A small browser app that parses GraphQL SDL and generates TypeScript interfaces and types alongside Zod validators and `z.infer` types. It was inspired by the developer-tool layout of [HiMat's converter](https://himat.tech/free-tools/graphql-schema-to-typescript-zod-converter); conversion runs locally in this app.

> **Try the original demo:** [GraphQL Schema to TypeScript + Zod Converter](https://himat.tech/free-tools/graphql-schema-to-typescript-zod-converter)

## Features

- Parse and validate GraphQL SDL with the official `graphql` parser.
- Generate TypeScript and Zod output from the same validated schema.
- Handle objects, inputs, interfaces, enums, unions, custom scalars, fields, lists, nested lists, and nullability.
- Ignore field arguments as object properties; preserve deprecation reasons as comments.
- Load a realistic sample, copy each output, or download either output as a `.ts` file.
- Show parse and schema validation errors without leaving old output on screen.
- Keep schemas in the browser: there is no backend, upload, analytics, or API key.

## Technologies

React, TypeScript, Vite, the official `graphql` package, and Zod. No database or server is used.

## Prerequisites

- Node.js 20 or newer (Node 18.18+ also supports current Vite 6).
- npm, included with Node.js.

## Install and run

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, typically <http://localhost:5173/>. To create and preview a production build:

```bash
npm run build
npm run preview
```

## How to use

1. Paste GraphQL SDL into the editor, or select **Load sample**.
2. Select **Convert schema**. Invalid SDL displays a readable error and clears stale generated output.
3. Use the TypeScript and Zod panels to copy or download each result. The downloads are `generated-types.ts` and `generated-zod.ts`.
4. Select **Clear** to reset the editor, outputs, and messages.

The Zod download imports `z` from `zod`. Install Zod in the project where you use the generated file. Both output files are standalone snippets; the Zod file includes stable type declarations for recursive schemas and `NameFromSchema` aliases inferred with `z.infer`.

## Supported definitions and mappings

| GraphQL SDL | TypeScript | Zod |
| --- | --- | --- |
| `String`, `ID` | `string` | `z.string()` |
| `Int`, `Float` | `number` | `z.number().int()`, `z.number()` |
| `Boolean` | `boolean` | `z.boolean()` |
| Custom scalar | `unknown` by default | `z.unknown()` |
| Object, input, interface | Exported interface | `z.object(...)` wrapped with `z.lazy(...)` |
| Enum | String literal union | `z.enum([...])` |
| Union | TypeScript union | `z.union([...])` |
| Lists | `Array<T>` including element nullability | `z.array(...)` including element nullability |
| Nullable type | Includes `null` at the matching nesting level | `.nullable()` at the matching nesting level |
| Non-null type (`!`) | Excludes `null` | No `.nullable()` |

GraphQL fields remain required properties. Nullability describes whether a value can be `null`; GraphQL SDL does not mark output fields as optional properties. Field arguments are omitted from generated object properties. Descriptions are emitted as comments where applicable, and `@deprecated` reasons are preserved in comments. Other directives are safely ignored for generation after SDL validation.

To map custom scalars to known TypeScript types, edit `SCALAR_TYPES` and the matching `SCALAR_ZOD_TYPES` object near the top of `src/converter.ts`. `DateTime` and `Date` are configured as strings in both outputs; other custom scalars default to `unknown` and `z.unknown()`.

## Limitations

- The converter focuses on type definitions. It validates the full schema but does not generate operation documents, resolvers, or argument/input defaults.
- Directives other than deprecation do not change generated validation behavior. Custom scalar runtime formats cannot be inferred from SDL.
- Unions validate against their member object shapes; since Zod objects strip unknown fields by default, this is not a discriminator-based runtime union.
- The TypeScript and Zod snippets are separate downloads. The Zod file includes its own type declarations so it can be used independently.
- GraphQL schema extensions contribute to validation but their added members are not yet merged into generated definitions.

## Privacy

The converter executes in the browser. It has no server, schema upload, analytics, external API, or credential requirement. All npm dependencies are only needed to install and run the local development app.

## HiMat Technologies

The reference tool is provided by HiMat Technologies. Find the team, learn more, or get in touch:

- **Website:** [himat.co.in](https://himat.co.in)
- **Email:** [info@himat.co.in](mailto:info@himat.co.in)
- **Phone:** [+91 94452 34023](tel:+919445234023)
- **Facebook:** [HiMat Technologies](https://www.facebook.com/people/Himat-technologies/61593829197445/)
- **LinkedIn:** [HiMat Technologies](https://www.linkedin.com/in/himat-technologies-14b1051b4)
- **Instagram:** [@himat_technologies](https://www.instagram.com/himat_technologies?stkn=djdmcGxweWtwYWI0)

## Project structure

```text
.
├── src/
│   ├── App.tsx          # User interface and browser actions
│   ├── converter.ts     # SDL parsing, validation, and code generation
│   ├── main.tsx         # React entry point
│   └── styles.css       # Responsive page styles
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```
