import { alpha, createTheme } from '@mui/material/styles';

/**
 * Material Design 3 theme factory for RunAdvisor.
 *
 * Generates M3-aligned light and dark palettes from a brand seed color.
 * The default seed is the running-orange #ef6c00 — Google's M3 spec
 * derives color roles (primary, onPrimary, primaryContainer, secondary,
 * surface, surfaceVariant, outline, error, etc.) from a single seed.
 * We hand-roll a coordinated mapping here instead of pulling in
 * material-color-utilities to keep the dependency surface flat.
 */

const BRAND_SEED = '#ef6c00';

const M3_TYPE_SCALE = {
  // M3 display
  display1: { fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', lineHeight: 1.12, letterSpacing: '-0.015em', fontWeight: 400 },
  // M3 headline
  h1: { fontSize: 'clamp(2rem, 4vw, 2.5rem)', lineHeight: 1.18, letterSpacing: '-0.01em', fontWeight: 600 },
  h2: { fontSize: 'clamp(1.625rem, 3vw, 2rem)', lineHeight: 1.22, letterSpacing: '-0.005em', fontWeight: 600 },
  h3: { fontSize: '1.5rem', lineHeight: 1.28, fontWeight: 600 },
  // M3 title
  h4: { fontSize: '1.375rem', lineHeight: 1.3, fontWeight: 600 },
  h5: { fontSize: '1.125rem', lineHeight: 1.35, fontWeight: 600 },
  h6: { fontSize: '1rem', lineHeight: 1.4, fontWeight: 600 },
  // M3 body / label
  subtitle1: { fontSize: '0.95rem', lineHeight: 1.45, fontWeight: 500 },
  subtitle2: { fontSize: '0.875rem', lineHeight: 1.4, fontWeight: 600 },
  body1: { fontSize: '1rem', lineHeight: 1.55, letterSpacing: '0.005em' },
  body2: { fontSize: '0.875rem', lineHeight: 1.55, letterSpacing: '0.0075em' },
  button: { fontSize: '0.9375rem', lineHeight: 1.25, letterSpacing: '0.025em', fontWeight: 600, textTransform: 'none' },
  caption: { fontSize: '0.75rem', lineHeight: 1.4, letterSpacing: '0.025em' },
  overline: { fontSize: '0.6875rem', lineHeight: 1.4, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }
};

function lightPaletteFromSeed(seed) {
  return {
    mode: 'light',
    primary: {
      main: seed,
      light: '#ff9d3a',
      dark: '#b53d00',
      contrastText: '#ffffff'
    },
    secondary: {
      main: '#5f6368',
      light: '#80868b',
      dark: '#3c4043',
      contrastText: '#ffffff'
    },
    tertiary: { main: '#0277bd', contrastText: '#ffffff' },
    error: { main: '#b3261e', light: '#dc362e', dark: '#8c1d18', contrastText: '#ffffff' },
    warning: { main: '#7d5800', light: '#a07419', dark: '#5b3f00', contrastText: '#ffffff' },
    info: { main: '#0277bd', light: '#039be5', dark: '#01579b', contrastText: '#ffffff' },
    success: { main: '#2e7d32', light: '#4caf50', dark: '#1b5e20', contrastText: '#ffffff' },
    background: {
      default: '#fef7f1',
      paper: '#ffffff',
      surface: '#fffbf8',
      surfaceVariant: '#f3ede6',
      surfaceContainer: '#fcf3ec',
      surfaceContainerHigh: '#f6ece4'
    },
    text: {
      primary: '#1f1b16',
      secondary: '#4f4639',
      disabled: '#7a7368'
    },
    divider: 'rgba(31, 27, 22, 0.12)',
    outline: 'rgba(31, 27, 22, 0.18)',
    action: {
      active: 'rgba(31, 27, 22, 0.6)',
      hover: 'rgba(239, 108, 0, 0.06)',
      selected: 'rgba(239, 108, 0, 0.12)',
      focus: 'rgba(239, 108, 0, 0.12)',
      disabled: 'rgba(31, 27, 22, 0.26)',
      disabledBackground: 'rgba(31, 27, 22, 0.08)'
    },
    primaryContainer: { main: '#ffdcc0', contrastText: '#321100' },
    secondaryContainer: { main: '#e6e0d6', contrastText: '#1d1b16' }
  };
}

function darkPaletteFromSeed(seed) {
  return {
    mode: 'dark',
    primary: {
      main: '#ffb786',
      light: '#ffd0b3',
      dark: '#ff8a3d',
      contrastText: '#532200'
    },
    secondary: {
      main: '#c9c5bd',
      light: '#e6e0d6',
      dark: '#9b968d',
      contrastText: '#1d1b16'
    },
    tertiary: { main: '#7fc4f0', contrastText: '#003547' },
    error: { main: '#f2b8b5', light: '#ffd9d6', dark: '#8c1d18', contrastText: '#601410' },
    warning: { main: '#f0c674', light: '#ffe19a', dark: '#a07419', contrastText: '#3d2c00' },
    info: { main: '#7fc4f0', light: '#bde0fb', dark: '#01579b', contrastText: '#003547' },
    success: { main: '#7adf80', light: '#a8e9aa', dark: '#1b5e20', contrastText: '#003910' },
    background: {
      default: '#1a120c',
      paper: '#221912',
      surface: '#1a120c',
      surfaceVariant: '#2c241b',
      surfaceContainer: '#251c14',
      surfaceContainerHigh: '#322619'
    },
    text: {
      primary: '#f4eee6',
      secondary: '#cfc7bb',
      disabled: '#8c8378'
    },
    divider: 'rgba(244, 238, 230, 0.12)',
    outline: 'rgba(244, 238, 230, 0.22)',
    action: {
      active: 'rgba(244, 238, 230, 0.7)',
      hover: 'rgba(255, 183, 134, 0.08)',
      selected: 'rgba(255, 183, 134, 0.16)',
      focus: 'rgba(255, 183, 134, 0.16)',
      disabled: 'rgba(244, 238, 230, 0.3)',
      disabledBackground: 'rgba(244, 238, 230, 0.12)'
    },
    primaryContainer: { main: '#723300', contrastText: '#ffdcc0' },
    secondaryContainer: { main: '#3e3b34', contrastText: '#e6e0d6' }
  };
}

function buildComponents(palette) {
  const isDark = palette.mode === 'dark';
  const surfaceContainer = palette.background.surfaceContainer;

  return {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: palette.background.default,
          color: palette.text.primary,
          minHeight: '100vh',
          fontFeatureSettings: '"ss01", "cv11"'
        },
        '::selection': {
          backgroundColor: palette.primary.main,
          color: palette.primary.contrastText
        }
      }
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: 'inherit' },
      styleOverrides: {
        root: {
          backgroundColor: palette.background.surface,
          color: palette.text.primary,
          borderBottom: `1px solid ${palette.divider}`,
          backgroundImage: 'none'
        }
      }
    },
    MuiToolbar: {
      styleOverrides: {
        root: { minHeight: 56, '@media (min-width:600px)': { minHeight: 64 } }
      }
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundColor: palette.background.paper,
          color: palette.text.primary,
          backgroundImage: 'none'
        },
        rounded: { borderRadius: 16 }
      }
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundColor: surfaceContainer,
          backgroundImage: 'none',
          border: `1px solid ${palette.divider}`,
          transition: 'background-color 160ms ease, border-color 160ms ease'
        }
      }
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: 16,
          '&:last-child': { paddingBottom: 16 },
          '@media (min-width:600px)': { padding: 20, '&:last-child': { paddingBottom: 20 } }
        }
      }
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 9999,
          paddingInline: 20,
          minHeight: 40,
          textTransform: 'none',
          fontWeight: 600
        },
        sizeLarge: { paddingBlock: 12, paddingInline: 24, minHeight: 48 },
        contained: {
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' }
        }
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          minWidth: 40,
          minHeight: 40
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 9999,
          fontWeight: 600,
          height: 28
        },
        sizeSmall: { height: 24 },
        outlined: {
          borderColor: palette.outline
        }
      }
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12
          }
        }
      }
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          backgroundColor: palette.background.surfaceContainer,
          borderTop: `1px solid ${palette.divider}`,
          height: 72,
          paddingBlock: 8
        }
      }
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          minWidth: 64,
          maxWidth: 168,
          borderRadius: 16,
          '&.Mui-selected': {
            color: palette.primary.main,
            '& .MuiBottomNavigationAction-label': { fontWeight: 700 }
          }
        }
      }
    },
    MuiFab: {
      defaultProps: { color: 'primary' },
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: isDark
            ? '0 3px 12px rgba(0,0,0,0.6), 0 1px 3px rgba(0,0,0,0.4)'
            : '0 3px 12px rgba(239,108,0,0.24), 0 1px 3px rgba(31,27,22,0.12)'
        }
      }
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: palette.background.surfaceContainer,
          backgroundImage: 'none'
        }
      }
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          color: palette.text.primary
        },
        standardSuccess: {
          backgroundColor: alpha(palette.success.main, isDark ? 0.16 : 0.12),
          color: isDark ? palette.success.light : palette.success.dark
        },
        standardInfo: {
          backgroundColor: alpha(palette.info.main, isDark ? 0.16 : 0.12),
          color: isDark ? palette.info.light : palette.info.dark
        },
        standardWarning: {
          backgroundColor: alpha(palette.warning.main, isDark ? 0.16 : 0.12),
          color: isDark ? palette.warning.light : palette.warning.dark
        },
        standardError: {
          backgroundColor: alpha(palette.error.main, isDark ? 0.16 : 0.12),
          color: isDark ? palette.error.light : palette.error.dark
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: palette.background.paper,
          color: palette.text.primary,
          backgroundImage: 'none'
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: palette.divider,
          color: palette.text.primary
        },
        head: {
          color: palette.text.secondary,
          fontWeight: 600
        }
      }
    },
    MuiTypography: {
      defaultProps: {
        color: 'textPrimary'
      }
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { height: 3, borderRadius: '3px 3px 0 0' }
      }
    },
    MuiStepper: {
      styleOverrides: {
        root: {
          padding: 0,
          backgroundColor: 'transparent'
        }
      }
    },
    MuiTooltip: {
      defaultProps: { arrow: true },
      styleOverrides: {
        tooltip: {
          backgroundColor: isDark ? palette.background.surfaceContainerHigh : '#1f1b16',
          color: isDark ? palette.text.primary : '#fffbf8',
          fontSize: '0.75rem',
          borderRadius: 6
        }
      }
    }
  };
}

export function getTheme(mode = 'light', seed = BRAND_SEED) {
  const palette = mode === 'dark' ? darkPaletteFromSeed(seed) : lightPaletteFromSeed(seed);

  return createTheme({
    palette,
    shape: { borderRadius: 16 },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      ...M3_TYPE_SCALE
    },
    components: buildComponents(palette)
  });
}

/**
 * Resolve "system" / "light" / "dark" preference into the concrete
 * mode that MUI should render with.
 */
export function resolveColorMode(preference) {
  if (preference === 'light' || preference === 'dark') {
    return preference;
  }

  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const THEME_BRAND_SEED = BRAND_SEED;
