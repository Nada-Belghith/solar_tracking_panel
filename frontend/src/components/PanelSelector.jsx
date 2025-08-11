import { useState, useEffect } from 'react';
import { Box, Typography, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { tokens } from '../theme';
import { useTheme } from '@mui/material';
import io from 'socket.io-client';

const PanelSelector = ({ onPanelChange }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [socket, setSocket] = useState(null);
  const [selectedPanel, setSelectedPanel] = useState('');  // Initialize with empty string
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
        
        // Set the selected panel from localStorage only if it exists in the fetched panels
        const savedPanel = localStorage.getItem('selectedDevice');
        if (savedPanel && data.some(panel => panel.id === savedPanel)) {
          setSelectedPanel(savedPanel);
        }
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
    // Initialize socket connection only when needed
    if (selectedClient && !socket) {
      const newSocket = io('http://localhost:3001');
      setSocket(newSocket);
    }
  }, [selectedClient, socket]);

  useEffect(() => {
    if (selectedClient && socket) {
      socket.emit('selectClient', selectedClient);

      const handleTelemetry = (data) => {
        setTelemetryData(data);
      };

      socket.on(`telemetry:${selectedClient.deviceId}`, handleTelemetry);

      return () => {
        socket.off(`telemetry:${selectedClient.deviceId}`, handleTelemetry);
      };
    }
  }, [selectedClient, socket]);

  // Cleanup socket on component unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

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
