import {
  buildASTSchema, GraphQLSchema, Kind, parse, type DefinitionNode, type FieldDefinitionNode, type InputValueDefinitionNode, type TypeNode,
} from 'graphql';

/** Edit this map when your API uses custom scalar values with a known TypeScript shape. */
const SCALAR_TYPES: Record<string, string> = { DateTime: 'string', Date: 'string', JSON: 'unknown', Upload: 'unknown' };
/** Keep these in step with SCALAR_TYPES whenever you add a custom mapping. */
const SCALAR_ZOD_TYPES: Record<string, string> = { DateTime: 'z.string()', Date: 'z.string()', JSON: 'z.unknown()', Upload: 'z.unknown()' };
const quote = (value: string) => JSON.stringify(value);
const typeToTs = (node: TypeNode): string => {
  if (node.kind === Kind.NON_NULL_TYPE) return requiredTypeToTs(node.type);
  return `${requiredTypeToTs(node)} | null`;
};
const requiredTypeToTs = (node: TypeNode): string => {
  if (node.kind === Kind.NON_NULL_TYPE) return requiredTypeToTs(node.type);
  if (node.kind === Kind.LIST_TYPE) return `Array<${typeToTs(node.type)}>`;
  const name = node.name.value;
  if (name === 'String' || name === 'ID') return 'string';
  if (name === 'Int' || name === 'Float') return 'number';
  if (name === 'Boolean') return 'boolean';
  return SCALAR_TYPES[name] ?? name;
};
const nullable = (node: TypeNode) => node.kind !== Kind.NON_NULL_TYPE;
const description = (value?: { description?: { value: string } | null }) => value?.description?.value;
const safeComment = (value: string) => value.replace(/\*\//g, '* /');
const docComment = (value?: string) => value ? `/**\n${safeComment(value).split('\n').map(line => ` * ${line}`).join('\n')}\n */\n` : '';
const deprecated = (field: FieldDefinitionNode | InputValueDefinitionNode) => {
  const directive = field.directives?.find(item => item.name.value === 'deprecated');
  const reason = directive?.arguments?.find(arg => arg.name.value === 'reason')?.value;
  return directive ? `@deprecated${reason?.kind === Kind.STRING ? ` ${safeComment(reason.value)}` : ''}` : '';
};

function gqlTypeToZod(node: TypeNode, known: Set<string>): string {
  if (node.kind === Kind.NON_NULL_TYPE) return requiredTypeToZod(node.type, known);
  return `${requiredTypeToZod(node, known)}.nullable()`;
}
function requiredTypeToZod(node: TypeNode, known: Set<string>): string {
  if (node.kind === Kind.NON_NULL_TYPE) return requiredTypeToZod(node.type, known);
  if (node.kind === Kind.LIST_TYPE) return `z.array(${gqlTypeToZod(node.type, known)})`;
  const name = node.name.value;
  const base: Record<string, string> = { String: 'z.string()', ID: 'z.string()', Int: 'z.number().int()', Float: 'z.number()', Boolean: 'z.boolean()' };
  return base[name] ?? (known.has(name) ? `${name}Schema` : 'z.unknown()');
}

export function convertSchema(source: string): { typescript: string; zod: string; typeCount: number } {
  if (!source.trim()) throw new Error('Paste a GraphQL schema first, or choose “Load sample”.');
  let document;
  try { document = parse(source); } catch (error) {
    const message = error instanceof Error ? error.message.replace(/\s+at \[.*$/s, '') : 'Could not parse GraphQL SDL.';
    throw new Error(`Invalid GraphQL SDL: ${message}`);
  }
  let schema: GraphQLSchema;
  try { schema = buildASTSchema(document, { assumeValidSDL: false }); } catch (error) {
    throw new Error(`GraphQL schema validation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  const definitions = document.definitions;
  const types = definitions.filter((item): item is Extract<DefinitionNode, { name: { value: string } }> => 'name' in item && !!item.name && item.kind !== Kind.DIRECTIVE_DEFINITION);
  const known = new Set(types.filter(item => item.kind === Kind.SCALAR_TYPE_DEFINITION || item.kind === Kind.OBJECT_TYPE_DEFINITION || item.kind === Kind.INPUT_OBJECT_TYPE_DEFINITION || item.kind === Kind.INTERFACE_TYPE_DEFINITION || item.kind === Kind.ENUM_TYPE_DEFINITION || item.kind === Kind.UNION_TYPE_DEFINITION).map(item => item.name.value));
  const ts: string[] = ['// Generated from GraphQL SDL. Nullable fields include null; fields stay required unless the SDL says otherwise.'];
  const zod: string[] = ['// Generated from GraphQL SDL. Object and input schemas use z.lazy for safe recursive references.', "import { z } from 'zod';", ''];

  for (const definition of types) {
    const name = definition.name.value;
    if (definition.kind === Kind.SCALAR_TYPE_DEFINITION) {
      ts.push(`/** Custom scalar ${name}; edit SCALAR_TYPES in the converter to map it. */\nexport type ${name} = ${SCALAR_TYPES[name] ?? 'unknown'};`);
      zod.push(`/** Custom scalar ${name}; update SCALAR_ZOD_TYPES with SCALAR_TYPES. */\nexport type ${name} = ${SCALAR_TYPES[name] ?? 'unknown'};\nexport const ${name}Schema: z.ZodType<${name}> = ${SCALAR_ZOD_TYPES[name] ?? 'z.unknown()'};\nexport type ${name}FromSchema = z.infer<typeof ${name}Schema>;`);
      continue;
    }
    if (definition.kind === Kind.ENUM_TYPE_DEFINITION) {
      const members = definition.values?.map(value => value.name.value) ?? [];
      ts.push(`${docComment(description(definition))}export type ${name} = ${members.map(quote).join(' | ') || 'never'};`);
      zod.push(`${docComment(description(definition))}export type ${name} = ${members.map(quote).join(' | ') || 'never'};\nexport const ${name}Schema: z.ZodType<${name}> = z.enum([${members.map(quote).join(', ')}]);\nexport type ${name}FromSchema = z.infer<typeof ${name}Schema>;`);
      continue;
    }
    if (definition.kind === Kind.UNION_TYPE_DEFINITION) {
      const members = definition.types?.map(type => type.name.value) ?? [];
      ts.push(`${docComment(description(definition))}export type ${name} = ${members.join(' | ') || 'never'};`);
      if (members.length === 0) throw new Error(`Union “${name}” has no members and cannot be represented by Zod.`);
      zod.push(`export type ${name} = ${members.join(' | ')};\nexport const ${name}Schema: z.ZodType<${name}> = z.union([${members.map(member => `z.lazy(() => ${member}Schema)`).join(', ')}]);\nexport type ${name}FromSchema = z.infer<typeof ${name}Schema>;`);
      continue;
    }
    if (definition.kind === Kind.OBJECT_TYPE_DEFINITION || definition.kind === Kind.INPUT_OBJECT_TYPE_DEFINITION || definition.kind === Kind.INTERFACE_TYPE_DEFINITION) {
      const fields = definition.fields ?? [];
      const parents = definition.kind === Kind.OBJECT_TYPE_DEFINITION || definition.kind === Kind.INTERFACE_TYPE_DEFINITION
        ? definition.interfaces?.map(item => item.name.value) ?? [] : [];
      const extendsText = parents.length ? ` extends ${parents.join(', ')}` : '';
      const properties = fields.map(field => {
        const comment = description(field);
        const deprecatedText = deprecated(field) ? `  /** ${deprecated(field)} */\n` : '';
        return `${deprecatedText}${comment ? `  /** ${comment.replace(/\*\//g, '* /')} */\n` : ''}  ${quote(field.name.value)}: ${typeToTs(field.type)};`;
      });
      const typeDeclaration = `${docComment(description(definition))}export interface ${name}${extendsText} {\n${properties.join('\n')}\n}`;
      ts.push(typeDeclaration);
      zod.push(typeDeclaration);
      const shape = fields.map(field => `  ${quote(field.name.value)}: ${gqlTypeToZod(field.type, known)},${deprecated(field) ? ` // ${deprecated(field)}` : ''}`).join('\n');
      zod.push(`${docComment(description(definition))}export const ${name}Schema: z.ZodType<${name}> = z.lazy(() => z.object({\n${shape}\n}));\nexport type ${name}FromSchema = z.infer<typeof ${name}Schema>;`);
      continue;
    }
    // Schema definitions, extensions and directive definitions affect validation, not generated value types.
  }
  // Keep schema usage and buildASTSchema in the same validation path; custom directives are accepted and ignored safely.
  void schema;
  return { typescript: ts.join('\n\n') + '\n', zod: zod.join('\n\n') + '\n', typeCount: types.length };
}

export const sampleSchema = `"A person who writes posts"\ntype User implements Node {\n  id: ID!\n  name: String!\n  email: String\n  role: UserRole!\n  posts(limit: Int = 10): [Post!]!\n}\n\ninterface Node { id: ID! }\nenum UserRole { ADMIN EDITOR READER }\n\ntype Post implements Node {\n  id: ID!\n  title: String!\n  body: String\n  tags: [String!]!\n  author: User!\n  related: [[Post]]\n}\n\ninput CreatePostInput { title: String! body: String tags: [String!] }\nunion SearchResult = User | Post\nscalar DateTime\ntype Query { users: [User!]! search: [SearchResult!]! }\ntype Mutation { createPost(input: CreatePostInput!): Post! }`;
