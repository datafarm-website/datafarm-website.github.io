# DATAFARM project page

Anonymous project page for *DATAFARM: Distribution-Aligned Task and Motion Planning for Fine-Tuning Vision-Language-Action Models*.

Static site: `index.html` + `static/`. There is no build step and no dependencies.

## Local preview

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy on GitHub Pages

Settings → Pages → Source: *Deploy from a branch* → `main` / `(root)`.

## Before de-anonymizing

- Fill in authors and affiliations in the hero (`index.html`).
- Enable the Paper / Code buttons (remove the `soon` class and add `href`s).
- Update the BibTeX entry.
- Remove `<meta name="robots" content="noindex, nofollow">` if you want the page indexed.
