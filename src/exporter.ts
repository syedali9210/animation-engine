import { strToU8, zipSync } from "fflate";
import { htmlUrl, type AnimMeta, type Values } from "./registry";

// Raw sources of every animation folder, loaded only when someone exports.
const RAW = import.meta.glob<string>("./animations/**/*.{ts,tsx,css,js,wgsl}", { query: "?raw", import: "default" });

/** JSON with bare keys — reads like hand-written TS/JS. */
const literal = (v: Values) => JSON.stringify(v, null, 2).replace(/^(\s+)"([A-Za-z_$][\w$]*)":/gm, "$1$2:");

export const paramsModule = (a: AnimMeta, v: Values) =>
  `// ${a.name} — tuned in Animation Engine. Every tunable property lives here.\nexport const params = ${literal(v)};\n\nexport type Params = typeof params;\n`;

/** Static pages carry their params between markers; the engine bridge script is dropped. */
export const bakeHtml = (html: string, v: Values) =>
  html
    .replace(/\/\* @engine:params \*\/[\s\S]*?\/\* @engine:end \*\//, () => `/* @engine:params */\nconst params = ${literal(v)};\n/* @engine:end */`)
    .replace(/[ \t]*<script src="\/engine-bridge\.js"><\/script>\r?\n?/, "");

const TRIGGER_LABEL = { ambient: "ambient loop", interaction: "plays on click", hover: "plays on hover", gesture: "drag gesture", sequence: "one-shot sequence", state: "state change" };

function readme(a: AnimMeta, v: Values, files: string[]) {
  const changed = Object.keys(a.schema).filter((k) => v[k] !== a.params[k]);
  const raw = files.some((f) => f.endsWith(".wgsl")) ? "\n4. The shader is imported with Vite's `?raw` suffix; in other bundlers import the `.wgsl` file as a string." : "";
  const use = a.html
    ? `Serve the folder over http (module scripts don't run from file://) and open \`${a.id}/index.html\`.\nTune it by editing the \`params\` object between the \`@engine:params\` markers.`
    : `1. \`npm i ${(a.deps ?? ["react"]).join(" ")}\` (plus Tailwind CSS v4 — the markup uses its classes)\n2. Copy ${[a.id, ...(a.includes ?? [])].map((f) => `\`${f}/\``).join(", ")} into your \`src/\`${a.assets?.length ? " and `public/` into your public folder" : ""}\n3. \`import Animation from "./${a.id}"\` and render \`<Animation />\` — it reads its values from \`${a.id}/params.ts\`.${raw}`;
  return `# ${a.name}

${a.blurb}

- **Category:** ${a.category} — ${TRIGGER_LABEL[a.behavior.trigger]}, seen ${a.behavior.frequency === "constant" ? "constantly" : a.behavior.frequency}
- **Tech:** ${a.tech.join(", ")}
- **Original:** \`${a.source}\`
- **Exported:** ${new Date().toISOString().slice(0, 10)} from Animation Engine, with your tuned values baked in (also in \`params.json\`).

## Use it

${use}

## Reduced motion

${a.reducedMotionNote} Per Emil Kowalski: reduced motion means fewer and gentler animations, not zero — keep opacity and colour, drop movement.

## Values

| Param | Value | Default |
| --- | --- | --- |
${Object.entries(a.schema)
  .map(([k, s]) => `| ${s.label}${changed.includes(k) ? " **(tuned)**" : ""} | \`${v[k]}\` | \`${a.params[k]}\` |`)
  .join("\n")}
`;
}

export async function exportFiles(a: AnimMeta, v: Values) {
  const files: Record<string, string | Uint8Array> = {};
  if (a.html) files[`${a.id}/index.html`] = bakeHtml(await (await fetch(htmlUrl(a))).text(), v);
  else {
    const folders = [a.id, ...(a.includes ?? [])];
    for (const [path, load] of Object.entries(RAW)) {
      const [, , folder, ...rest] = path.split("/");
      const file = rest.join("/");
      if (!folders.includes(folder) || file === "meta.ts") continue;
      files[`${folder}/${file}`] = folder === a.id && file === "params.ts" ? paramsModule(a, v) : await load();
    }
  }
  for (const asset of a.assets ?? []) {
    const own = `/anim/${a.id}/`;
    const to = a.html && asset.startsWith(own) ? `${a.id}/${asset.slice(own.length)}` : `public${asset}`;
    files[to] = new Uint8Array(await (await fetch(asset)).arrayBuffer());
  }
  files["params.json"] = JSON.stringify(v, null, 2) + "\n";
  files["README.md"] = readme(a, v, Object.keys(files));
  return files;
}

export async function downloadZip(a: AnimMeta, v: Values) {
  const files = await exportFiles(a, v);
  const zip = zipSync(Object.fromEntries(Object.entries(files).map(([k, x]) => [`${a.id}-export/${k}`, typeof x === "string" ? strToU8(x) : x])));
  const url = URL.createObjectURL(new Blob([zip as BlobPart], { type: "application/zip" }));
  Object.assign(document.createElement("a"), { href: url, download: `${a.id}-export.zip` }).click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
