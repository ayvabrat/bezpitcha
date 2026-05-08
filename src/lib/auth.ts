const KEY = "bezpitcha_token";
const PASSWORD = "bezpitcha.ru";

export const auth = {
  getToken: () => (typeof window === "undefined" ? null : localStorage.getItem(KEY)),
  isAuthenticated: () => !!auth.getToken(),
  login: async (password: string) => {
    if (password !== PASSWORD) throw new Error("Неверный пароль");
    const token = btoa(`bezpitcha:${Date.now()}`);
    localStorage.setItem(KEY, token);
    return { token, expires_in: 86400 };
  },
  logout: () => localStorage.removeItem(KEY),
};
