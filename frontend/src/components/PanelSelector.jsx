import { useState, useEffect } from 'react';
import { Box, Typography, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { tokens } from '../theme';
import { useTheme } from '@mui/material';

const PanelSelector = ({ onPanelChange }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [selectedPanel, setSelectedPanel] = useState(localStorage.getItem('selectedDevice') || '');
  const [panels, setPanels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

   useEffect(() => {
    const fetchPanels = async () => {
      try {
        const token = localStorage.getItem('jwt');
        const response = await fetch('http://localhost:3001/api/panels/list', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) throw new Error('Erreur lors de la récupération des panneaux');
        
        const data = await response.json();
        setPanels(data);
      } catch (err) {
        setError('Erreur lors du chargement des panneaux');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPanels();
  }, []);

  useEffect(() => {
    // Ensure the initial value matches one of the available options
    if (!panels.some(panel => panel.id === selectedPanel)) {
      setSelectedPanel('');
    }
  }, [panels]);

  // Debugging: Log panels to verify data
  useEffect(() => {
    console.log('Panels loaded:', panels);
  }, [panels]);

  const handleChange = (event) => {
    const panelId = event.target.value;
    setSelectedPanel(panelId);
    localStorage.setItem('selectedDevice', panelId);
    if (onPanelChange) {
      onPanelChange(panelId);
    }
  };

  return (
    <Box mb={3}>
      <FormControl fullWidth variant="filled" sx={{
        backgroundColor: colors.primary[400],
        borderRadius: '4px',
        minWidth: 200
      }}>
        <InputLabel sx={{ color: colors.grey[100] }}>
          {loading ? 'Chargement des panneaux...' : 'Sélectionner un Panneau'}
        </InputLabel>
        <Select
          value={selectedPanel}
          onChange={handleChange}
          disabled={loading}
          sx={{
            color: colors.grey[100],
            '& .MuiSelect-icon': {
              color: colors.grey[100]
            }
          }}
        >
          <MenuItem value="">
            <em>Choisir un panneau</em>
          </MenuItem>
          {panels.length > 0 ? (
            panels.map(panel => (
              <MenuItem key={panel.id} value={panel.id}>
                {panel.name}
              </MenuItem>
            ))
          ) : (
            <MenuItem disabled>
              {loading ? 'Chargement...' : 'Aucun panneau disponible'}
            </MenuItem>
          )}
        </Select>
      </FormControl>
    </Box>
  );
};

export default PanelSelector;
