# Modular Networks

A static website for Modular Networks, presenting secure, scalable network solution services.

## Local Preview

Open `index.html` directly in a browser, or run a small local server from the project root:

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Deploy

This repository is ready for GitHub Pages. Publish from the `main` branch using the repository root (`/`) as the Pages source.

With the GitHub CLI:

```sh
gh repo create modular-networks --public --source=. --remote=origin --push
gh api repos/{owner}/{repo}/pages -X POST -f 'source[branch]=main' -f 'source[path]=/'
```

The site will be available at:

```text
https://<github-username>.github.io/modular-networks/
```
