# KAILASH.LAB

Portfolio of Kailash G — a cinematic digital laboratory built with Vite, TypeScript and Three.js.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/
npm run preview
```

## Edit content
All copy lives in `src/content/resume.ts` (profile, career stages, experiments, skills, the "Off the clock" `about`
section, credentials, and the "exploring now" lines).

## How it works
- **Journey** (`src/core/CameraRig.ts`): every section is a station along −z. Scrolling flies the camera forward
  from one to the next through a hex tunnel (`src/world/Tunnel.ts`) that brightens with speed; scrolling up flies back.
  The skill constellation (`src/world/Constellation.ts`) waits at the Toolkit station.
- **Swarm** (`src/world/Swarm.ts`): one GPGPU particle system in world space that rides just ahead of the camera.
  Each particle is springed to a slot in the current shape, so changing shape is a single texture swap; during a
  flight particles lag on their springs and stream through the tunnel like a comet. A per-shape aux texture animates
  parts on the GPU (phone layers breathing apart, Tyson's tail wagging, wheels spinning, a blinking cursor).
- **Shapes** (`src/world/shapes/`): every section has its own silhouette — the name, a phone, a database, the icon of
  each project and skill group, Tyson, a barbell, a coupe, a planet, a paper plane… 2D shapes are drawn on a
  100×100 canvas board and sampled; 3D ones are parametric. Add one to `SHAPES` in `library.ts`.
- **Director** (`src/core/ShapeDirector.ts`): maps the section on screen (and the active stage/project/skill/interest)
  to a shape. `src/core/CameraRig.ts` frames the swarm beside the text per section.
- **Intro** (`src/ui/Intro.ts`): the name is plain HTML on first paint, then the particles assemble it and flow into the
  hero. No button; any scroll, click or key skips it. Returning visitors get a shorter version.
- **Notes** (`src/ui/ShapeNotes.ts`): small hand-drawn callouts pinned to the active shape (desktop only).
- **UI**: HUD, reticle cursor (own animation loop; native cursor returns if it ever stalls; follows modal dialogs into
  the top layer), lab reports (`<dialog>`), hidden console (press `` ` ``), optional WebAudio ambience.
- **Fallbacks**: quality tiers + FPS governor, `prefers-reduced-motion` (no intro, cuts instead of travel), and a
  text-only mode when WebGL is unavailable. All content is real HTML; the canvas is decorative.

Dev only: `window.__lab.exp.debugShape = 'tyson'` pins a shape for tuning.

Deploys as static files (Vercel, Netlify, GitHub Pages, any CDN).
