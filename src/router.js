const routes = [];

const usesHashRouting = () => window.location.hostname.endsWith("github.io");

export function currentRoutePath() {
  if (!usesHashRouting()) return window.location.pathname;
  return window.location.hash.replace(/^#/, "") || "/";
}

export function registerRoute(path, render) {
  routes.push({ path, render });
}

export function navigate(path) {
  if (usesHashRouting()) {
    window.location.hash = path;
    return;
  }
  window.history.pushState({}, "", path);
  window.dispatchEvent(new Event("unibox:navigate"));
}

export function resolveRoute(pathname) {
  const directMatch = routes.find((route) => route.path === pathname);
  if (directMatch) return directMatch;

  if (pathname.startsWith("/labs/")) {
    return routes.find((route) => route.path === "/labs/:slug");
  }

  return routes.find((route) => route.path === "/404");
}
