import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  Button,
  FormControl,
  InputLabel,
  CircularProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

const ClientSelector = () => {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const token = localStorage.getItem('jwt');
        const response = await fetch('http://localhost:3001/api/panels/list', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) throw new Error('Erreur lors de la récupération des clients');
        
        const data = await response.json();
        setClients(data);
      } catch (err) {
        setError('Erreur lors du chargement des clients');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

  const handleClientSelect = async (event) => {
    const panelId = event.target.value;
    setSelectedClient(panelId);
    
    const selectedPanel = clients.find(p => p.panel_id === panelId);
    if (selectedPanel) {
      try {
        // Mettre à jour la connexion ThingsBoard
        const token = localStorage.getItem('jwt');
        const response = await fetch('http://localhost:3001/api/panels/connect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            deviceId: selectedPanel.device_id_thingsboard,
            token: selectedPanel.token_thingsboard
          })
        });

        if (!response.ok) {
          throw new Error('Erreur lors de la mise à jour de la connexion');
        }

        console.log('📱 Panneau sélectionné:', {
          deviceId: selectedPanel.device_id_thingsboard,
          token: selectedPanel.token_thingsboard,
          panelName: selectedPanel.panel_name,
          timestamp: new Date().toISOString()
        });

        // Sauvegarder les informations du device dans le localStorage
        localStorage.setItem('selectedDevice', JSON.stringify({
          deviceId: selectedPanel.device_id_thingsboard,
          token: selectedPanel.token_thingsboard,
          clientName: selectedPanel.client_name,
          panelName: selectedPanel.panel_name
        }));
      } catch (error) {
        console.error('Erreur lors de la mise à jour de la connexion:', error);
      }
    }
  };

  const handleContinue = () => {
    const selectedDevice = localStorage.getItem('selectedDevice');
    if (selectedClient && selectedDevice) {
      navigate('/dashboard');
    }
  };

  // Rediriger vers la page de login si pas de token
  useEffect(() => {
    const token = localStorage.getItem('jwt');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
    <CircularProgress />
  </Box>;

  if (error) return <Box p={3}>
    <Typography color="error">{error}</Typography>
  </Box>;

  return (
    <Box maxWidth={400} mx="auto" mt={8} p={3}>
      <Typography variant="h5" mb={3}>
        Sélectionner un panneau solaire
      </Typography>
      
      <FormControl fullWidth>
        <InputLabel>Panneau solaire</InputLabel>
        <Select
          value={selectedClient}
          onChange={handleClientSelect}
          label="Panneau solaire"
        >
          {clients.map((panel) => (
            <MenuItem 
              key={panel.panel_id} 
              value={panel.panel_id}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start'
              }}
            >
              <Typography variant="body1">{panel.panel_name}</Typography>
              <Typography variant="caption" color="textSecondary">
                Client: {panel.client_name}
                <br />
                Adresse: {panel.address}
              </Typography>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Button
        fullWidth
        variant="contained"
        color="primary"
        sx={{ mt: 3 }}
        disabled={!selectedClient}
        onClick={handleContinue}
      >
        Continuer
      </Button>
    </Box>
  );
};

export default ClientSelector;
