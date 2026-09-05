#!/usr/bin/env node
/**
 * Generates src/types/database.ts by introspecting a live Postgres schema.
 *
 * Why not `supabase gen types`: the CLI runs pg-meta inside Docker, which is
 * not available in every build environment. This script reads the same
 * catalogs directly over a normal connection and emits the same shape,
 * including the Relationships entries PostgREST type inference needs for
 * nested selects.
 *
 *   node scripts/gen-types.mjs "postgresql://postgres@localhost:5433/dadb" > src/types/database.ts
 */

import pg from 'pg';

const dbUrl = process.argv[2];
if (!dbUrl) {
  console.error('usage: gen-types.mjs <postgres-url>');
  process.exit(1);
}

const SCALARS = {
  uuid: 'string',
  text: 'string',
  varchar: 'string',
  bpchar: 'string',
  name: 'string',
  citext: 'string',
  int2: 'number',
  int4: 'number',
  int8: 'number',
  float4: 'number',
  float8: 'number',
  numeric: 'number',
  bool: 'boolean',
  json: 'Json',
  jsonb: 'Json',
  date: 'string',
  timestamp: 'string',
  timestamptz: 'string',
  time: 'string',
  timetz: 'string',
  interval: 'string',
  bytea: 'string',
  void: 'undefined',
  record: 'Json',
};

const client = new pg.Client({ connectionString: dbUrl });
await client.connect();

const { rows: enumRows } = await client.query(`
  select t.typname as name, e.enumlabel as label
  from pg_type t
  join pg_enum e on e.enumtypid = t.oid
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public'
  order by t.typname, e.enumsortorder
`);

const enums = new Map();
for (const row of enumRows) {
  if (!enums.has(row.name)) enums.set(row.name, []);
  enums.get(row.name).push(row.label);
}

const { rows: columns } = await client.query(`
  select c.relname            as table_name,
         a.attname            as column_name,
         a.attnum             as position,
         format_type(a.atttypid, a.atttypmod) as formatted,
         t.typname            as type_name,
         t.typcategory        as type_category,
         et.typname           as element_type,
         not a.attnotnull     as is_nullable,
         (a.atthasdef and ad.adbin is not null) as has_default,
         a.attidentity <> ''  as is_identity,
         a.attgenerated <> '' as is_generated
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  join pg_type t on t.oid = a.atttypid
  left join pg_type et on et.oid = t.typelem
  left join pg_attrdef ad on ad.adrelid = c.oid and ad.adnum = a.attnum
  where n.nspname = 'public'
    and c.relkind = 'r'
    and a.attnum > 0
    and not a.attisdropped
  order by c.relname, a.attnum
`);

const { rows: fks } = await client.query(`
  select con.conname                         as constraint_name,
         child.relname                       as table_name,
         parent.relname                      as referenced_table,
         array_agg(ca.attname::text order by u.ord) as columns,
         array_agg(pa.attname::text order by u.ord) as referenced_columns,
         (select count(*) > 0
            from pg_index i
           where i.indrelid = con.conrelid
             and i.indisunique
             -- A PARTIAL unique index does not make the relationship
             -- one-to-one: it only constrains the rows matching its
             -- predicate. Treating it as one-to-one makes PostgREST infer a
             -- single embedded object where an array is returned.
             and i.indpred is null
             and (select array_agg(k order by k) from unnest(i.indkey::int2[]) k)
               = (select array_agg(k order by k) from unnest(con.conkey) k)) as is_one_to_one
  from pg_constraint con
  join pg_class child on child.oid = con.conrelid
  join pg_class parent on parent.oid = con.confrelid
  join pg_namespace n on n.oid = child.relnamespace
  cross join lateral unnest(con.conkey, con.confkey) with ordinality as u(ck, fk, ord)
  join pg_attribute ca on ca.attrelid = con.conrelid and ca.attnum = u.ck
  join pg_attribute pa on pa.attrelid = con.confrelid and pa.attnum = u.fk
  where con.contype = 'f' and n.nspname = 'public'
  group by con.conname, child.relname, parent.relname, con.conrelid, con.conkey
  order by child.relname, con.conname
`);

const { rows: functions } = await client.query(`
  select p.proname as name,
         p.proretset as returns_set,
         rt.typname  as return_type,
         p.proargnames::text[] as arg_names,
         p.pronargdefaults as arg_defaults_count,
         p.proargmodes::text[] as arg_modes,
         coalesce(
           (select array_agg(at.typname::text order by u.ord)
              from unnest(coalesce(p.proallargtypes, p.proargtypes::oid[])) with ordinality as u(oid, ord)
              join pg_type at on at.oid = u.oid),
           '{}'
         ) as arg_types
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  join pg_type rt on rt.oid = p.prorettype
  where n.nspname = 'public'
    and p.prokind = 'f'
    and not exists (
      select 1 from pg_depend d
      where d.objid = p.oid and d.deptype = 'e'
    )
  order by p.proname
`);

await client.end();

function tsType(col) {
  const isArray = col.type_category === 'A';
  const base = isArray ? col.element_type : col.type_name;
  let mapped;
  if (enums.has(base)) {
    mapped = enums.get(base).map((v) => `'${v}'`).join(' | ');
    if (isArray) mapped = `(${mapped})`;
  } else {
    mapped = SCALARS[base] ?? 'unknown';
  }
  return isArray ? `${mapped}[]` : mapped;
}

function scalarTsType(typeName) {
  if (enums.has(typeName)) return enums.get(typeName).map((v) => `'${v}'`).join(' | ');
  return SCALARS[typeName] ?? 'unknown';
}

const tables = new Map();
for (const col of columns) {
  if (!tables.has(col.table_name)) tables.set(col.table_name, []);
  tables.get(col.table_name).push(col);
}

const out = [];
out.push('/**');
out.push(' * GENERATED FILE — do not edit by hand.');
out.push(' *');
out.push(' * Produced from the live schema by scripts/gen-types.mjs:');
out.push(' *   npm run types:generate');
out.push(' *');
out.push(' * Regenerate after every migration.');
out.push(' */');
out.push('');
out.push('export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];');
out.push('');
out.push('export type Database = {');
out.push('  public: {');
out.push('    Tables: {');

for (const [table, cols] of [...tables].sort(([a], [b]) => a.localeCompare(b))) {
  out.push(`      ${table}: {`);

  out.push('        Row: {');
  for (const col of cols) {
    out.push(`          ${col.column_name}: ${tsType(col)}${col.is_nullable ? ' | null' : ''};`);
  }
  out.push('        };');

  out.push('        Insert: {');
  for (const col of cols) {
    if (col.is_generated) continue; // generated columns are never written
    const optional = col.is_nullable || col.has_default || col.is_identity;
    out.push(
      `          ${col.column_name}${optional ? '?' : ''}: ${tsType(col)}${col.is_nullable ? ' | null' : ''};`,
    );
  }
  out.push('        };');

  out.push('        Update: {');
  for (const col of cols) {
    if (col.is_generated) continue;
    out.push(`          ${col.column_name}?: ${tsType(col)}${col.is_nullable ? ' | null' : ''};`);
  }
  out.push('        };');

  const tableFks = fks.filter((fk) => fk.table_name === table);
  if (tableFks.length === 0) {
    out.push('        Relationships: [];');
  } else {
    out.push('        Relationships: [');
    for (const fk of tableFks) {
      out.push('          {');
      out.push(`            foreignKeyName: '${fk.constraint_name}';`);
      out.push(`            columns: [${fk.columns.map((c) => `'${c}'`).join(', ')}];`);
      out.push(`            isOneToOne: ${fk.is_one_to_one};`);
      out.push(`            referencedRelation: '${fk.referenced_table}';`);
      out.push(
        `            referencedColumns: [${fk.referenced_columns.map((c) => `'${c}'`).join(', ')}];`,
      );
      out.push('          },');
    }
    out.push('        ];');
  }

  out.push('      };');
}

out.push('    };');
out.push('    Views: Record<never, never>;');
out.push('    Functions: {');

for (const fn of functions) {
  const names = fn.arg_names ?? [];
  const types = fn.arg_types ?? [];
  const modes = fn.arg_modes ?? null;
  const defaultsCount = fn.arg_defaults_count ?? 0;

  const args = [];
  const outParams = [];
  for (let i = 0; i < types.length; i += 1) {
    const mode = modes ? modes[i] : 'i';
    const name = names[i];
    if (!name) continue;
    if (mode === 'o' || mode === 't') outParams.push([name, types[i]]);
    else args.push([name, types[i]]);
  }

  // Postgres attaches defaults to the LAST `pronargdefaults` input
  // parameters (it requires all-defaulted args to be trailing). Marking
  // those optional in TypeScript matches what PostgREST actually accepts:
  // callers may omit any suffix of them, exactly like `funnel_summary()`
  // called with zero, one, two, or three arguments.
  const argsType =
    args.length === 0
      ? 'Record<string, never>'
      : `{ ${args
          .map(([n, t], i) => {
            const optional = args.length - i <= defaultsCount;
            return `${n}${optional ? '?' : ''}: ${scalarTsType(t)}`;
          })
          .join('; ')} }`;

  let returns;
  if (outParams.length > 0) {
    returns = `{ ${outParams.map(([n, t]) => `${n}: ${scalarTsType(t)} | null`).join('; ')} }`;
  } else {
    returns = scalarTsType(fn.return_type);
  }
  if (fn.returns_set) returns = `${returns}[]`;

  out.push(`      ${fn.name}: { Args: ${argsType}; Returns: ${returns} };`);
}

out.push('    };');
out.push('    Enums: {');
for (const [name, values] of [...enums].sort(([a], [b]) => a.localeCompare(b))) {
  out.push(`      ${name}: ${values.map((v) => `'${v}'`).join(' | ')};`);
}
out.push('    };');
out.push('    CompositeTypes: Record<never, never>;');
out.push('  };');
out.push('};');
out.push('');

process.stdout.write(out.join('\n'));
