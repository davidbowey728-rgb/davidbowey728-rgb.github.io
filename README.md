# Molten Institute — moltenresearch.com

Website for **Molten Institute**, an AI research institute working on large language models,
fine-tuning, step-based reasoning, autonomous agents, interpretability and AI for medicine.
Home of **[Sanila](https://sanila.org)**.

Pure HTML / CSS / JavaScript — no build step, no dependencies.

```
index.html               all page content
404.html                 not-found page
assets/css/style.css     design system, layout, motion
assets/js/core.js        shared utilities + visibility-aware animation loop
assets/js/universe.js    landing cosmos: WebGL black hole / nebula / lensing + equation galaxy, novas, nexus
assets/js/viz.js         section canvases (research areas, pipeline stages, DNA helix, Sanila sphere)
assets/js/lab.js         Fine-Tuning Lab and attention visualizer
assets/js/main.js        loader, cursor, scroll choreography, dossiers, reasoning traces, Ctrl+K navigation
assets/img/              logo mark and icons
```

Run locally: `python -m http.server 8080` then open http://localhost:8080
