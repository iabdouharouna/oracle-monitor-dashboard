import React from 'react';
import { Alert, Button, Box } from '@mui/material';
import { Refresh } from '@mui/icons-material';

interface ErrorDisplayProps {
  error: Error | string | null;
  onRetry?: () => void;
  title?: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ 
  error, 
  onRetry, 
  title = 'An error occurred' 
}) => {
  if (!error) return null;

  const message = error instanceof Error ? error.message : error;

  return (
    <Alert severity="error" sx={{ mb: 2 }} action={
      onRetry ? (
        <Button size="small" startIcon={<Refresh />} onClick={onRetry}>
          Retry
        </Button>
      ) : undefined
    }>
      <strong>{title}</strong>
      <br />
      {message}
    </Alert>
  );
};