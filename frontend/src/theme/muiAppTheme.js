import { createTheme } from '@mui/material/styles';

/**
 * Material Design–aligned theme (MUI) for RunAdvisor.
 * Primary accent follows the existing orange running brand.
 */
export function createAppTheme(mode) {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isDark ? '#fb923c' : '#e65100',
        dark: isDark ? '#ea580c' : '#bf360c',
        light: isDark ? '#fdba74' : '#ff9800',
        contrastText: isDark ? '#0f172a' : '#ffffff'
      },
      secondary: {
        main: isDark ? '#94a3b8' : '#546e7a',
        contrastText: isDark ? '#0f172a' : '#ffffff'
      },
      background: {
        default: isDark ? '#0b1220' : '#fafafa',
        paper: isDark ? '#111827' : '#ffffff'
      },
      divider: isDark ? 'rgba(148, 163, 184, 0.16)' : 'rgba(15, 23, 42, 0.08)',
      success: { main: isDark ? '#4ade80' : '#2e7d32' },
      warning: { main: isDark ? '#fbbf24' : '#f57c00' },
      error: { main: isDark ? '#f87171' : '#c62828' }
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      h1: { fontWeight: 700, letterSpacing: -0.02 },
      h2: { fontWeight: 700, letterSpacing: -0.015 },
      h3: { fontWeight: 600 },
      button: { fontWeight: 600, textTransform: 'none' }
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundImage: isDark
              ? 'radial-gradient(ellipse 120% 80% at 50% -20%, rgba(251, 146, 60, 0.12), transparent 55%)'
              : 'radial-gradient(ellipse 120% 80% at 50% -20%, rgba(230, 81, 0, 0.06), transparent 50%)'
          }
        }
      },
      MuiButton: {
        defaultProps: { disableElevation: false },
        styleOverrides: {
          root: { borderRadius: 999, paddingInline: 20 },
          sizeLarge: { paddingBlock: 10, paddingInline: 22 }
        }
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            border: `1px solid ${isDark ? 'rgba(148, 163, 184, 0.14)' : 'rgba(15, 23, 42, 0.08)'}`,
            backgroundImage: isDark
              ? 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 40%)'
              : 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(250,250,250,0.98) 100%)'
          }
        }
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: isDark
              ? 'linear-gradient(180deg, rgba(17,24,39,0.92) 0%, rgba(11,18,32,0.88) 100%)'
              : 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(250,250,250,0.92) 100%)',
            borderBottom: `1px solid ${isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(15, 23, 42, 0.08)'}`
          }
        }
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600 }
        }
      },
      MuiPaper: {
        styleOverrides: {
          rounded: { borderRadius: 16 }
        }
      }
    }
  });
}
