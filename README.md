# Molten Institute — moltenresearch.com

Website for **Molten Institute**, an AI research institute working on large language models,
fine-tuning, step-based reasoning, autonomous agents, interpretability and AI for medicine.
Home of **[Sanila](https://sanila.org)**.

Pure HTML / CSS / JavaScript — no build step, no dependencies.

```
index.html            all page content
404.html              custom not-found page
assets/css/style.css  design system, layout, motion
assets/js/core.js     shared loop, WebGL molten core shader, ember particles
assets/js/viz.js      canvas visualizations (research vectors, forge stages, DNA helix, Sanila orb, warp)
assets/js/main.js     boot sequence, cursor, scroll choreography, dossiers, Step Engine, Ctrl+K terminal
```

Run locally: `python -m http.server 8080` then open http://localhost:8080
