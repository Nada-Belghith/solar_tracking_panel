import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  TextField,
  Button,
  FormControl,
  InputLabel,
  CircularProgress
} from '@mui/material';
import Header from "../../components/Header";

const InverterConfig = () => {
  const [panels, setPanels] = useState([]);
  const [selectedPanel, setSelectedPanel] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [inverterInfo, setInverterInfo] = useState({ serial: '' });
  const [successMessage, setSuccessMessage] = useState('');
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    const fetchPanels = async () => {
      try {
        const token = localStorage.getItem('jwt');
        const response = await fetch('http://localhost:3001/api/panels/list', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Erreur lors de la récupération des panneaux');
        const data = await response.json();
        setPanels(data);
      } catch (err) {
        console.error(err);
        setError('Erreur lors du chargement des panneaux');
      } finally {
        setLoading(false);
      }
    };
    fetchPanels();
  }, []);

  const handlePanelSelect = (event) => {
    const panelId = event.target.value;
    setSelectedPanel(panelId);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInverterInfo({ [name]: value });
  };

  const handleSubmit = async () => {
    try {
      if (!selectedPanel) throw new Error('Veuillez sélectionner un panneau');
      if (!inverterInfo.serial) throw new Error('Numéro de série requis');
      setIsConfiguring(true);
      setSubmitError('');
      setSuccessMessage('');

      const token = localStorage.getItem('jwt');
      const resp = await fetch('http://localhost:3001/api/panels/updatedeviceSN', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ panelId: selectedPanel, device_sn: inverterInfo.serial })
      });

      if (!resp.ok) {
        const body = await resp.text().catch(() => null);
        console.error('Erreur backend updateDeviceSN', resp.status, body);
        throw new Error('Erreur lors de l\'enregistrement du numéro de série sur le backend');
      }

      setSuccessMessage('Numéro de série enregistré avec succès');
    } catch (err) {
      console.error(err);
      setSubmitError(err.message || 'Erreur');
    } finally {
      setIsConfiguring(false);
    }
  };

  if (loading && panels.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box m="20px">
      <Header title="CONFIGURATION ONDULEUR" subtitle="Associez et configurez un onduleur" />

      <Box display="flex" flexDirection="column" gap={3} maxWidth={700} mx="auto" mt={4}>
        <Typography variant="subtitle1" color="textSecondary">
          Entrez le numéro de série de l'onduleur et associez-le à un panneau existant.
        </Typography>

        <FormControl fullWidth>
          <InputLabel>Panneau solaire (associer)</InputLabel>
          <Select value={selectedPanel} onChange={handlePanelSelect} label="Panneau solaire (associer)">
            <MenuItem value="">-- Sélectionner --</MenuItem>
            {panels.map((panel) => (
              <MenuItem key={panel.panel_id} value={panel.panel_id}>
                <Box>
                  <Typography variant="body1">{panel.panel_name}</Typography>
                  <Typography variant="caption" color="textSecondary">{panel.client_name} — {panel.address}</Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>



        <TextField
          fullWidth
          label="Numéro de série"
          name="serial"
          value={inverterInfo.serial}
          onChange={handleChange}
          error={!!submitError && !inverterInfo.serial}
          helperText={!!submitError && !inverterInfo.serial ? submitError : ''}
          placeholder="Ex: INV-123456789"
        />

        <Box display="flex" gap={2} justifyContent="flex-end" alignItems="center">
          {submitError && (
            <Typography color="error" sx={{ mr: 2 }}>{submitError}</Typography>
          )}
          {successMessage && (
            <Typography color="success.main" sx={{ mr: 2 }}>{successMessage}</Typography>
          )}
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            disabled={isConfiguring || !selectedPanel || !inverterInfo.serial}
          >
            {isConfiguring ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default InverterConfig;
