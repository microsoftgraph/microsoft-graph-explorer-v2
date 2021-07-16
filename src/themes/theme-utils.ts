const key = 'CURRENT_THEME';

export function saveTheme(theme: string) {
  localStorage.setItem(key, theme);
}

export function readTheme() {
  const theme = localStorage.getItem(key);
  return theme;
}
