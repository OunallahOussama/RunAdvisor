import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { coachApi } from '../services/api';

function SemanticSearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await coachApi.semanticSearch(query);
      setResults(response.data.results || []);
      setMessage(response.data.results?.length ? '' : 'No matching runs found.');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Search failed.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Find runs by description
        </Typography>
        <Box component="form" onSubmit={handleSearch}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
              fullWidth
              label="Search your runs"
              onChange={(e) => setQuery(e.target.value)}
              placeholder="hilly tempo, long slow distance, recovery"
              value={query}
            />
            <Button disabled={loading || !query.trim()} type="submit" variant="contained">
              Search
            </Button>
          </Stack>
        </Box>
        {message && <Alert severity="info" sx={{ mt: 2 }}>{message}</Alert>}
        {results.length > 0 && (
          <Stack spacing={1} sx={{ mt: 2 }}>
            {results.map((run) => (
              <Box
                key={run.activityId}
                component={RouterLink}
                to={`/activities/${run.activityId}`}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: 1,
                  borderColor: 'divider',
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'block'
                }}
              >
                <Typography variant="body2" fontWeight={600}>{run.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {(run.score * 100).toFixed(0)}% match · {run.distanceKm} km
                </Typography>
              </Box>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

export default SemanticSearchBar;
