// Render/local use same-origin API. GitHub Pages uses the deployed Render API.
if (window.location.hostname.endsWith("github.io")) {
  window.UNIBOX_API_BASE = "https://unibox-mvp-startup.onrender.com";
}
