const STORAGE_KEY = "mw_theme";

export function getStoredTheme() {
  const t = localStorage.getItem(STORAGE_KEY);
  return t === "dark" || t === "light" ? t : null;
}

export function getPreferredTheme() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getTheme() {
  return getStoredTheme() || getPreferredTheme();
}

export function applyTheme(theme) {
  const t = theme === "dark" ? "dark" : "light";
  document.documentElement.classList.toggle("dark", t === "dark");
}

export function setTheme(theme) {
  const t = theme === "dark" ? "dark" : "light";
  localStorage.setItem(STORAGE_KEY, t);
  applyTheme(t);
  return t;
}
