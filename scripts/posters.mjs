// Re-shoots the library cards' stills (public/thumbs) through the running dev server.
// Run: npm run dev, then npm run posters            (or npm run posters <id> <id>… for just those)
const base = process.env.ENGINE_URL ?? "http://localhost:5180";
const r = await fetch(`${base}/__studio/posters`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ only: process.argv.slice(2) }),
}).catch(() => null);
if (!r) {
  console.error(`posters: no dev server at ${base} (start it with npm run dev)`);
  process.exit(1);
}
const body = await r.json();
if (!r.ok) {
  console.error("posters:", body.error);
  process.exit(1);
}
console.log(`posters: ${body.made.length} animations, light and dark, in public/thumbs`);
