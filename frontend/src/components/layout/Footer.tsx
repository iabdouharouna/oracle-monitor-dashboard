import React from 'react';
import { Box, Typography, Link } from '@mui/material';

export const Footer: React.FC = () => (
  <Box
    sx={{
      p: 2,
      textAlign: 'center',
      borderTop: 1,
      borderColor: 'divider',
      backgroundColor: 'background.default',
      fontSize: '0.75rem',
      color: 'text.secondary',
    }}
  >
    <Typography variant="caption">
      Oracle Monitor Dashboard v1.0.0
      {' '}
      <Link href="https://github.com" target="_blank" rel="noopener">
        GitHub
      </Link>
      {' | '}
      <Link href="#/settings" rel="noopener">
        Documentation
      </Link>
    </Typography>
  </Box>
);