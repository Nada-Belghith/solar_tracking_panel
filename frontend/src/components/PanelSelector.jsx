import { useState, useEffect } from 'react';
import { Box, Typography, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { tokens } from '../theme';
import { useTheme } from '@mui/material';
import io from 'socket.io-client';

const socket = io('http://localhost:3000'); // URL du backend

const PanelSelector = ({ onPanelChange }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [selectedPanel, setSelectedPanel] = useState(localStorage.getItem('selectedDevice') || '');
  const [panels, setPanels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [telemetryData, setTelemetryData] = useState(null);

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

  useEffect(() => {
    if (selectedClient) {
      socket.emit('selectClient', selectedClient);

      socket.on(`telemetry:${selectedClient.deviceId}`, (data) => {
        setTelemetryData(data);
      });
    }

    return () => {
      if (selectedClient) {
        socket.off(`telemetry:${selectedClient.deviceId}`);
      }
    };
  }, [selectedClient]);

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

      <div>
        <h1>Sélectionnez un client</h1>
        <select onChange={(e) => setSelectedClient(JSON.parse(e.target.value))}>
          {/* Remplir avec les clients */}
          <option value='{"deviceId":"123", "token":"abc"}'>Client 1</option>
          <option value='{"deviceId":"456", "token":"def"}'>Client 2</option>
        </select>

        {telemetryData && (
          <div>
            <h2>Données de télémétrie</h2>
            <pre>{JSON.stringify(telemetryData, null, 2)}</pre>
          </div>
        )}
      </div>
    </Box>
  );
};

export default PanelSelector;
