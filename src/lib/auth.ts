const KEY = "bezpitcha_auth";
const PASSWORD = "bezpitcha.ru";

export function login(password: string): boolean {
  if (password !== PASSWORD) return false;
  localStorage.setItem(KEY, "1");
  return true;
}

export function logout() {
  localStorage.removeItem(KEY);
}

export function isAuthed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY) === "1";
}
