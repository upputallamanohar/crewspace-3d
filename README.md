# Crewspace

A bright, animated React playground bringing all ten projects from `crewai_projects.html` into one website. The redesigned interface uses cobalt blue, tangerine, butter yellow, mint, and lilac, with a real Three.js WebGL sculpture, ten animated CSS 3D project objects, pointer tilt, a moving banner, manual text inputs, and downloadable results.

## Open the standalone website

Open the supplied **crewspace.html** in a modern browser. React, styles, and all ten local workflows are included in that one file; no installation or server is required. The standalone version processes input entirely in the browser. Google Fonts may load online, with system fonts available offline. Browser storage and clipboard availability depend on the browser's local-file settings; downloads remain available.

To regenerate that HTML from the source after installing dependencies:

```sh
npm run build:standalone
```

The generated file is placed one directory above this source folder.

## Run locally

Install Node.js 24 or newer, then open a terminal in this folder:

```sh
npm run install:ci
npm run dev
```

Open **http://localhost:5173**. Keep that terminal running while using the website. The app includes its server route; there is no separate backend process or API key to configure.

For a production build and local preview:

```sh
npm run build
npm start
```

Open **http://localhost:3000** after starting the production preview. These commands build and preview locally; they do not publish a public website.

On Windows machines where `npm` is blocked by PowerShell's script policy, use `npm.cmd` in place of `npm`. If a trusted workplace proxy causes certificate errors, Node.js 24 can use the system certificate store without disabling certificate validation:

```powershell
$env:NODE_OPTIONS='--use-system-ca'
npm.cmd run install:ci
```

## The ten workspaces

1. Blog Post Crew — assemble an article draft from a topic and supplied notes.
2. Competitor Analysis Crew — structure supplied competitor facts into a comparison.
3. Meeting Notes Crew — extract discussion points, explicit decisions, and actions.
4. Data Report Crew — parse CSV and calculate checked numeric statistics.
5. Customer Support Flow — suggest ticket routing, priority, and a reply draft.
6. Resume Screening Flow — identify text evidence for explicit job skills for human review.
7. Bug Triage Flow — prepare bug, feature, or question notes and a tracker reply.
8. Content Repurposing Flow — prepare LinkedIn, thread, and newsletter drafts.
9. Lead Qualification Flow — check supplied notes against explicit criteria.
10. Approval Report Flow — prepare a report and require a person's approval before final download.

Choose **Open workspace**, type or paste your text, then select **Run project**. **Try an example** fills the form with sample data. Results can be reviewed, copied, and downloaded. Drafts and the last 20 runs are stored in the current browser's local storage.

## Processing behavior

This working version uses a deterministic text-processing engine. It does not call CrewAI or a remote AI model, research live websites, send messages, or connect to external CRMs. Article and report outputs are drafts assembled from the text provided. Resume output identifies evidence for requested skills; a person makes all hiring decisions. In the server version, inputs are sent to this app's `/api/run` endpoint for processing; in the standalone HTML, the same validated code runs in the browser. Inputs are not written to an application database.

The visual workflow stages reflect the ten ideas in the supplied document. A live CrewAI/LLM integration would be a separate backend addition requiring provider credentials and the relevant external tools.

## Source map

- `app/page.tsx` — React dashboard, forms, outputs, and browser storage.
- `app/globals.css` — responsive light theme and interface animation.
- `components/crew-scene.tsx` and `.css` — Three.js sculpture with drag rotation, physically lit materials, moving satellites, and CSS 3D fallback.
- `components/project-tile.tsx` and `.css` — ten animated project sculptures and pointer-responsive 3D cards.
- `lib/projects.ts` — all ten project definitions, fields, examples, and workflow stages.
- `lib/workflow-engine.ts` — input validation and local processing for all ten projects.
- `app/api/run/route.ts` — validated HTTP POST endpoint.
- `components/standalone.tsx` and `scripts/build-standalone.mjs` — self-contained browser build using the same workflow code.

Run `npm test` to check all ten sample workflows and input-validation cases. Run `node node_modules/typescript/bin/tsc --noEmit` to check TypeScript.

Built with React, TypeScript, Node.js, Vite/Vinext, and Lucide icons. The portable version runs both React and the HTTP endpoint in Node.js. The optional managed Cloudflare configuration is retained separately for future hosted deployment.

## 3D controls

Drag the main sculpture to rotate it, or focus it and use the arrow keys. Move the mouse across the sculpture and project cards to see parallax and tilt. The Motion toggle in the navigation pauses automatic movement. System reduced-motion preferences are respected. If WebGL is unavailable, the hero shows an animated CSS 3D fallback. All graphics are generated locally; no external 3D assets or API keys are required.

