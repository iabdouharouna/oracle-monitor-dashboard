import { createTheme, ThemeOptions, Theme } from '@mui/material/styles';
import type {} from '@mui/x-data-grid/themeAugmentation';

export const sqlDeveloperPalette = {
  primary: {
    main: '#0066CC',
    light: '#4D94DB',
    dark: '#004499',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#FF8C00',
    light: '#FFB340',
    dark: '#CC7000',
    contrastText: '#FFFFFF',
  },
  success: {
    main: '#00A651',
    light: '#33C973',
    dark: '#00853F',
  },
  warning: {
    main: '#FF8C00',
    light: '#FFB340',
    dark: '#CC7000',
  },
  error: {
    main: '#D13438',
    light: '#E84C5E',
    dark: '#A8282A',
  },
  info: {
    main: '#0078D4',
    light: '#4DA8DA',
    dark: '#005FA3',
  },
  background: {
    default: '#F5F7FA',
    paper: '#FFFFFF',
  },
  divider: '#E1E4E8',
  text: {
    primary: '#1A1A1A',
    secondary: '#605E5C',
    disabled: '#A19F9D',
  },
  action: {
    hover: 'rgba(0, 102, 204, 0.08)',
    selected: 'rgba(0, 102, 204, 0.12)',
    disabled: 'rgba(0, 0, 0, 0.26)',
  },
};

const lightThemeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    ...sqlDeveloperPalette,
  },
  typography: {
    fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
    h1: { fontWeight: 600, fontSize: '2rem', lineHeight: 1.2 },
    h2: { fontWeight: 600, fontSize: '1.5rem', lineHeight: 1.3 },
    h3: { fontWeight: 600, fontSize: '1.25rem', lineHeight: 1.3 },
    h4: { fontWeight: 600, fontSize: '1.125rem', lineHeight: 1.4 },
    h5: { fontWeight: 600, fontSize: '1rem', lineHeight: 1.4 },
    h6: { fontWeight: 600, fontSize: '0.875rem', lineHeight: 1.4 },
    body1: { fontSize: '0.875rem', lineHeight: 1.5 },
    body2: { fontSize: '0.8125rem', lineHeight: 1.5 },
    button: { fontWeight: 500, textTransform: 'none' },
    caption: { fontSize: '0.75rem', lineHeight: 1.5 },
    overline: { fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
  },
  shape: {
    borderRadius: 4,
  },
  shadows: [
    'none',
    '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
    '0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)',
    '0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)',
    '0 20px 25px rgba(0,0,0,0.1), 0 10px 10px rgba(0,0,0,0.04)',
    '0 25px 50px rgba(0,0,0,0.15)',
    ...(Array(19).fill('none') as string[]),
  ] as Theme['shadows'],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '*': { boxSizing: 'border-box' },
        html: { WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' },
        body: { margin: 0, minHeight: '100vh' },
        '::-webkit-scrollbar': { width: 8, height: 8 },
        '::-webkit-scrollbar-track': { background: '#F1F1F1' },
        '::-webkit-scrollbar-thumb': { background: '#C1C1C1', borderRadius: 4 },
        '::-webkit-scrollbar-thumb:hover': { background: '#A1A1A1' },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid #E1E4E8',
        },
        elevation1: { boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
        elevation2: { boxShadow: '0 4px 6px rgba(0,0,0,0.07)' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { border: '1px solid #E1E4E8', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 500, borderRadius: 4 },
        containedPrimary: { boxShadow: 'none', '&:hover': { boxShadow: '0 2px 4px rgba(0,102,204,0.3)' } },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: { '& .MuiOutlinedInput-root': { '&:hover fieldset': { borderColor: '#0066CC' } } },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 600, backgroundColor: '#F5F7FA', borderBottom: '2px solid #E1E4E8' },
        root: { borderBottom: '1px solid #E1E4E8', padding: '8px 12px' },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: { border: '1px solid #E1E4E8', borderRadius: 4 },
        columnHeaders: { backgroundColor: '#F5F7FA', borderBottom: '2px solid #E1E4E8' },
        row: { '&:hover': { backgroundColor: '#F0F6FC' } },
        cell: { borderBottom: '1px solid #E1E4E8' },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { backgroundColor: '#0066CC', height: 3 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 500, fontSize: '0.875rem', minHeight: 40 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500, fontSize: '0.75rem' },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 4 },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { fontSize: '0.75rem', borderRadius: 4, padding: '6px 10px' },
      },
    },
  },
};

const darkThemeOptions: ThemeOptions = {
  palette: {
    mode: 'dark',
    primary: sqlDeveloperPalette.primary,
    secondary: sqlDeveloperPalette.secondary,
    success: { main: '#4CC38A', dark: '#2E8B64' },
    warning: sqlDeveloperPalette.warning,
    error: { main: '#E56A6E', dark: '#B23A3E' },
    info: sqlDeveloperPalette.info,
    background: {
      default: '#1E2430',
      paper: '#262E3D',
    },
    divider: '#3A4356',
    text: {
      primary: '#E6E9EF',
      secondary: '#9AA3B2',
      disabled: '#5C6472',
    },
  },
  typography: lightThemeOptions.typography,
  shape: lightThemeOptions.shape,
  shadows: lightThemeOptions.shadows,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '*': { boxSizing: 'border-box' },
        html: { WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' },
        body: { margin: 0, minHeight: '100vh' },
        '::-webkit-scrollbar': { width: 8, height: 8 },
        '::-webkit-scrollbar-track': { background: '#1E2430' },
        '::-webkit-scrollbar-thumb': { background: '#3A4356', borderRadius: 4 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid #3A4356',
        },
        elevation1: { boxShadow: '0 1px 3px rgba(0,0,0,0.4)' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { border: '1px solid #3A4356', boxShadow: '0 1px 3px rgba(0,0,0,0.4)' },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 500, borderRadius: 4 },
        containedPrimary: { boxShadow: 'none' },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 600, backgroundColor: '#232B39', borderBottom: '1px solid #3A4356' },
        root: { borderBottom: '1px solid #3A4356', padding: '8px 12px' },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: { border: '1px solid #3A4356', borderRadius: 4 },
        columnHeaders: { backgroundColor: '#232B39', borderBottom: '1px solid #3A4356' },
        row: { '&:hover': { backgroundColor: '#2E3A4E' } },
        cell: { borderBottom: '1px solid #3A4356' },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { backgroundColor: '#4D94DB', height: 3 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 500, fontSize: '0.875rem', minHeight: 40 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500, fontSize: '0.75rem' },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { fontSize: '0.75rem', borderRadius: 4, padding: '6px 10px' },
      },
    },
  },
};

export const theme = createTheme(lightThemeOptions);

export const darkTheme = createTheme(darkThemeOptions);

export function createAppTheme(mode: 'light' | 'dark'): Theme {
  return mode === 'dark' ? darkTheme : theme;
}