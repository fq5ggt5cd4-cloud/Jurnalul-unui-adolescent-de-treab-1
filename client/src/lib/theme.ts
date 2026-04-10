import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

let transitionTimer: ReturnType<typeof setTimeout> | null = null;

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light';
        set({ theme: next });
        applyTheme(next);
      },
      setTheme: (t) => {
        set({ theme: t });
        applyTheme(t);
      },
    }),
    {
      name: 'jurnalul-theme',
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme);
      },
    }
  )
);

function applyTheme(theme: Theme) {
  const root = document.documentElement;

  if (transitionTimer) {
    clearTimeout(transitionTimer);
  }

  root.classList.add('theme-transitioning');

  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  transitionTimer = setTimeout(() => {
    root.classList.remove('theme-transitioning');
    transitionTimer = null;
  }, 500);
}
