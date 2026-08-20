import { writeFileSync } from "node:fs";

const META = process.env.META_URL || "http://172.19.0.9:8080";
const SCHEMA = "public";
const OUT = process.env.OUT_PATH || "/srv/horecasmart/dashboard-src/supabase/types-generated.d.ts";

const scalarMap = {
  "int2": "number", "int4": "number", "int8": "number", "smallint": "number",
  "integer": "number", "bigint": "number", "serial": "number", "bigserial": "number",
  "real": "number", "float4": "number", "float8": "number", "double precision": "number",
  "numeric": "number", "decimal": "number", "money": "number", "oid": "number",
  "bool": "boolean", "boolean": "boolean",
  "json": "Json", "jsonb": "Json",
  "text": "string", "varchar": "string", "bpchar": "string", "char": "string",
  "name": "string", "uuid": "string", "citext": "string", "inet": "string",
  "cidr": "string", "macaddr": "string", "macaddr8": "string", "date": "string",
  "time": "string", "timetz": "string", "time with time zone": "string",
  "time without time zone": "string", "timestamp": "string", "timestamptz": "string",
  "timestamp with time zone": "string", "timestamp without time zone": "string",
  "interval": "string", "bytea": "string", "xml": "string", "tsvector": "string",
  "tsquery": "string", "geometry": "string", "geography": "string", "point": "string",
  "line": "string", "lseg": "string", "box": "string", "path": "string",
  "polygon": "string", "circle": "string", "bit": "string", "varbit": "string",
  "regtype": "string", "vector": "string", "array": "string",
};

const tables = (await fetch(`${META}/tables?include_columns=true`)).ok
  ? await (await fetch(`${META}/tables?include_columns=true`)).json()
  : [];
const typesRaw = (await fetch(`${META}/types`)).ok
  ? await (await fetch(`${META}/types`)).json()
  : [];
const funcs = (await fetch(`${META}/functions`)).ok
  ? await (await fetch(`${META}/functions`)).json()
  : [];

let views = [];
try {
  const vr = await fetch(`${META}/views`);
  if (vr.ok) views = await vr.json();
} catch { views = []; }

const enumMap = {};
for (const t of typesRaw) {
  if (t.schema === SCHEMA && Array.isArray(t.enums) && t.enums.length > 0) {
    enumMap[t.name] = t.enums;
  }
}

const fmt = (t) => JSON.stringify(t);

function mapBase(format) {
  let isArray = false;
  let base = format;
  if (typeof format === "string" && format.startsWith("_")) {
    isArray = true;
    base = format.slice(1);
  }
  let mapped = scalarMap[base];
  if (!mapped) {
    if (enumMap[base] !== undefined) mapped = `Database["public"]["Enums"]["${base}"]`;
    else mapped = "string";
  }
  return isArray ? `${mapped}[]` : mapped;
}

function colType(col) {
  return mapBase(col.format);
}

function genRow(cols) {
  const lines = cols.map((c) => {
    const base = colType(c);
    const t = c.is_nullable ? `${base} | null` : base;
    return `      ${JSON.stringify(c.name)}: ${t}`;
  });
  return `{\n${lines.join(",\n")}\n      }`;
}

function genInsert(cols) {
  const lines = cols.map((c) => {
    const base = colType(c);
    const optional = c.is_nullable || c.default_value != null || c.is_identity || c.is_generated;
    const t = optional ? `${base} | null` : base;
    return `      ${JSON.stringify(c.name)}: ${t}`;
  });
  return `{\n${lines.join(",\n")}\n      }`;
}

function genUpdate(cols) {
  const lines = cols.map((c) => {
    const t = `${colType(c)} | null`;
    return `      ${JSON.stringify(c.name)}: ${t}`;
  });
  return `{\n${lines.join(",\n")}\n      }`;
}

const publicTables = tables.filter((t) => t.schema === SCHEMA);
const publicViews = views.filter((v) => v.schema === SCHEMA);
const publicFuncs = funcs.filter((f) => f.schema === SCHEMA);
const publicEnums = Object.keys(enumMap);

const compositeTypes = typesRaw.filter(
  (t) => t.schema === SCHEMA && Array.isArray(t.attributes) && t.attributes.length > 0,
);

let out = "";
out += "export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]\n\n";
out += "export type Database = {\n";
out += "  public: {\n";
out += "    Tables: {\n";
for (const t of publicTables) {
  out += `      ${JSON.stringify(t.name)}: {\n`;
  out += `        Row: ${genRow(t.columns || [])}\n`;
  out += `        Insert: ${genInsert(t.columns || [])}\n`;
  out += `        Update: ${genUpdate(t.columns || [])}\n`;
  out += `        Relationships: []\n`;
  out += `      }\n`;
}
out += "    }\n";
out += "    Views: {\n";
for (const v of publicViews) {
  out += `      ${JSON.stringify(v.name)}: {\n`;
  out += `        Row: ${genRow(v.columns || [])}\n`;
  out += `      }\n`;
}
out += "    }\n";
out += "    Functions: {\n";
for (const f of publicFuncs) {
  out += `      ${JSON.stringify(f.name)}: {\n`;
  out += `        Args: any\n`;
  out += `        Returns: any\n`;
  out += `      }\n`;
}
out += "    }\n";
out += "    Enums: {\n";
for (const en of publicEnums) {
  const vals = enumMap[en].map((v) => JSON.stringify(String(v))).join(" | ");
  out += `      ${JSON.stringify(en)}: ${vals}\n`;
}
out += "    }\n";
out += "    CompositeTypes: {\n";
for (const ct of compositeTypes) {
  const attrs = ct.attributes.map((a) => `      ${JSON.stringify(a.name)}: ${mapBase(a.format)}\n`).join("");
  out += `      ${JSON.stringify(ct.name)}: {\n${attrs}      }\n`;
}
out += "    }\n";
out += "  }\n";
out += "}\n\n";

out += `type PublicSchema = Database[Extract<keyof Database, string>]\n\n`;
out += `export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName]
  : (PublicSchema["Tables"] & PublicSchema["Views"])[PublicTableNameOrOptions]

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName]["Insert"]
  : PublicSchema["Tables"][PublicTableNameOrOptions]["Insert"]

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName]["Update"]
  : PublicSchema["Tables"][PublicTableNameOrOptions]["Update"]

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicSchema["Enums"][PublicEnumNameOrOptions]

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
`;

writeFileSync(OUT, out);
console.log("tables:", publicTables.length, "views:", publicViews.length, "funcs:", publicFuncs.length, "enums:", publicEnums.length, "composites:", compositeTypes.length);
console.log("wrote", OUT, (out.length / 1024).toFixed(0) + " KB");
if (publicTables[0]) console.log("sample column keys:", JSON.stringify(Object.keys(publicTables[0].columns[0] || {})));
