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
import { useNavigate } from 'react-router-dom';
import Header from "../../components/Header";

const PanelConfig = () => {
  const [panels, setPanels] = useState([]);
  const [selectedPanel, setSelectedPanel] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showConfirmButton, setShowConfirmButton] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [espConfigOk, setEspConfigOk] = useState(false);
  const [configStep, setConfigStep] = useState(1); // Pour suivre l'étape de configuration
  const [wifiConfig, setWifiConfig] = useState({
    networkName: '',
    ssid: ''
  });
  const [deviceInfo, setDeviceInfo] = useState({
    latitude: '',
    longitude: '',
    elevation: '',
    token: '',
    deviceId: ''
  });
  const navigate = useNavigate();

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

  const handlePanelSelect = (event) => {
    const panelId = event.target.value;
    const selectedPanel = panels.find(p => p.panel_id === panelId);
    
    if (selectedPanel) {
      // On récupère les coordonnées du client associé au panneau
      setDeviceInfo({
        latitude: selectedPanel.latitude,
        longitude: selectedPanel.longitude,
        elevation: selectedPanel.elevation,
        token: selectedPanel.token_thingsboard,
        deviceId: selectedPanel.device_id_thingsboard
      });
      console.log('📍 Coordonnées chargées:', {
        latitude: selectedPanel.latitude,
        longitude: selectedPanel.longitude,
        elevation: selectedPanel.elevation
      });
      setSelectedPanel(panelId);
    }
  };

  const handleWifiChange = (event) => {
    const { name, value } = event.target;
    setWifiConfig(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const sendConfigToESP = async (configData) => {
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        console.log('🔄 Tentative d\'envoi à l\'ESP:', configData);
        
        // Créer les données au format attendu par l'ESP
        const formData = new URLSearchParams();
        formData.append('ssid', configData.network_name);
        formData.append('pass', configData.wifi_password);
        formData.append('token', configData.token);
        formData.append('longitude', configData.longitude);
        formData.append('latitude', configData.latitude);
        formData.append('elevation', configData.elevation);

        // Envoyer au bon endpoint avec le bon format
        // Use AbortController to implement a proper timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);

        try {
          const postUrl = 'http://192.168.4.1/save';
          console.log('📤 Envoi POST vers URL:', postUrl);
          const espResponse = await fetch(postUrl, {
            method: 'POST',
            mode: 'no-cors', // ESP usually doesn't send CORS headers
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData,
            signal: controller.signal
          });

          // In no-cors mode the response is opaque; if fetch resolved we assume the packet was sent
          console.log('📡 Requête envoyée au point /save (no-cors) — réponse opaque attendue');
          clearTimeout(timeoutId);
          return { success: true };
        } catch (err) {
          clearTimeout(timeoutId);
          // If the abort caused the error, throw a descriptive message so retry can occur
          if (err.name === 'AbortError') {
            console.error('⏱️ Timeout lors de l\'envoi vers l\'ESP (abort)');
            throw err;
          }
          console.error('❌ Erreur fetch vers ESP:', err);
          throw err;
        }
        
        // Note: En mode 'no-cors', on ne peut pas vérifier espResponse.ok
        // ni lire le corps de la réponse
      } catch (error) {
        console.error(`❌ Tentative ${attempts + 1} échouée:`, error);
        attempts++;
        if (attempts === maxAttempts) {
          throw new Error(
            'Impossible de communiquer avec l\'ESP. Vérifiez que:\n\n' +
            '1. Vous êtes bien connecté au réseau WiFi de l\'ESP (ESP_XXXX)\n' +
            '2. Vous pouvez accéder à http://192.168.4.1 dans votre navigateur\n' +
            '3. L\'ESP est sous tension et en mode configuration'
          );
        }
        // Attendre 2 secondes avant de réessayer
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  };

  const handleSubmit = async () => {
    try {
      console.log('🚀 Démarrage de la validation des données...');

      if (!wifiConfig.networkName || !wifiConfig.ssid || !deviceInfo.latitude || 
          !deviceInfo.longitude || !deviceInfo.elevation || !deviceInfo.deviceId || 
          !deviceInfo.token) {
        throw new Error('Tous les champs sont requis');
      }

      console.log('📝 Préparation des données de configuration...');
      // Sauvegarder les données
      const configData = {
        network_name: wifiConfig.networkName,
        wifi_password: wifiConfig.ssid,
        latitude: deviceInfo.latitude,
        longitude: deviceInfo.longitude,
        elevation: deviceInfo.elevation,
        token: deviceInfo.token
      };

      localStorage.setItem('selectedDevice', JSON.stringify({
        deviceId: deviceInfo.deviceId,
        token: deviceInfo.token,
        panelName: panels.find(p => p.panel_id === selectedPanel)?.panel_name
      }));

      localStorage.setItem('espConfigData', JSON.stringify(configData));

      // Afficher les instructions
      alert(
        "Instructions de configuration :\n\n" +
        "1. Connectez-vous au réseau WiFi de l'ESP (nom: 'ESP_XXXX')\n" +
        "2. Une fois connecté à l'ESP, actualisez cette page (F5)\n" +
        "3. Cliquez sur le bouton 'Envoyer la configuration'\n" +
        "4. Si rien ne se passe, vérifiez que:\n" +
        "   - Vous êtes bien connecté au WiFi de l'ESP\n" +
        "   - L'ESP est allumé et en mode configuration\n" +
        "   - Actualisez la page et réessayez\n" +
        "5. Attendez la confirmation avant de reconnecter votre WiFi habituel"
      );

      setShowConfirmButton(true);
      setConfigStep(2); // Passer à l'étape 2
      alert(
        "✅ Configuration sauvegardée avec succès!\n\n" +
        "Étapes suivantes :\n" +
        "1. Connectez-vous au réseau WiFi nommé 'ESP_XXXX'\n" +
        "2. Revenez sur cette page\n" +
        "3. Cliquez sur le bouton 'Envoyer la configuration'"
      );
    } catch (error) {
      console.error('💥 Erreur lors de la validation:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const checkESPConnection = async () => {
    console.log('🔍 Vérification de la connexion ESP...');
    // Primary: try fetch with timeout using AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      await fetch('http://192.168.4.1/save', { mode: 'no-cors', signal: controller.signal });
      clearTimeout(timeoutId);
      console.log('✅ Fetch vers 192.168.4.1 réussi (no-cors)');
      return true;
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn('⚠️ Fetch check failed:', err && err.name ? err.name : err);
      // Fallback: try loading a small image from the device (works around some fetch/network issues)
      try {
        const imgResult = await new Promise((resolve) => {
          const img = new Image();
          let resolved = false;
          const timer = setTimeout(() => {
            if (!resolved) { resolved = true; resolve(false); }
          }, 4000);
          img.onload = () => { if (!resolved) { resolved = true; clearTimeout(timer); resolve(true); } };
          img.onerror = () => { if (!resolved) { resolved = true; clearTimeout(timer); resolve(false); } };
        });
        if (imgResult) {
          console.log('✅ Image ping vers 192.168.4.1 réussi');
          return true;
        }
      } catch (e) {
        console.warn('⚠️ Fallback image ping failed:', e);
      }
      return false;
    }
  };

  const handleConfirmConfig = async () => {
    try {
      console.log('🔄 Démarrage de la configuration ESP...');
      setIsConfiguring(true);

      // Vérifier d'abord la connexion à l'ESP
      const isConnected = await checkESPConnection();
      if (!isConnected) {
        throw new Error(
          "Impossible de se connecter à l'ESP.\n\n" +
          "Veuillez vérifier que :\n" +
          "1. Vous êtes connecté au réseau WiFi 'ESP_XXXX'\n" +
          "2. L'ESP est allumé et en mode configuration\n" +
          "3. Actualisez la page après vous être connecté au réseau ESP"
        );
      }
      
      console.log('📦 Récupération des données de configuration...');
      const configData = JSON.parse(localStorage.getItem('espConfigData'));
      
      if (!configData) {
        console.error('❌ Données de configuration non trouvées');
        throw new Error('Données de configuration non trouvées');
      }

      console.log('📡 Envoi de la configuration à l\'ESP...');
      const result = await sendConfigToESP(configData);
      
  if (result) {
        console.log('✅ Configuration ESP réussie!');

        // Appeler configureDevice pour mettre à jour l'état backend
        console.log('🔄 Appel de configureDevice sur le backend...');
        const token = localStorage.getItem('jwt');
        // Récupérer panelId (device_id ThingsBoard) depuis deviceInfo
        const panelId = deviceInfo.deviceId;

        // Appel au backend et gestion de la réponse
        const backendResp = await fetch('http://localhost:3001/api/panels/configureDevice', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            panelId,
            configData
          })
        });

        if (!backendResp.ok) {
          const body = await backendResp.text().catch(() => null);
          console.error('❌ Erreur backend configureDevice', backendResp.status, body);
          throw new Error('Erreur lors de la configuration du panneau sur le backend');
        }

        console.log('✅ Configuration backend réussie!', { status: backendResp.status });

        // Defensive: ensure UI state is updated even if an earlier branch misfired
        try {
          setShowConfirmButton(false);
          setConfigStep(3);
          setPanels(prev => prev.map(p => p.panel_id === selectedPanel ? { ...p, state: 'configuré' } : p));
          setEspConfigOk(true);
        } catch (setErr) {
          console.warn('⚠️ Erreur en mettant à jour l\'état UI après configuration:', setErr);
        }
        // Ensure spinner is stopped
        setIsConfiguring(false);
        console.log('ℹ️ États mis à jour: showConfirmButton=false, espConfigOk=true, isConfiguring=false');

        // Notify user but keep them on the page; user can return to dashboard manually
        // Small alert for backward compatibility
        alert(
          "Configuration réussie !\n\n" +
          "L'ESP a été configuré correctement. Cliquez sur 'Retour au dashboard' pour revenir."
        );
        // do not auto-navigate so the UI can show the success state and stop the spinner
      }
    } catch (error) {
      console.error('❌ Erreur lors de la configuration ESP:', error);
      alert(`Erreur de configuration: ${error.message}\n\nVérifiez votre connexion au réseau WiFi de l'ESP.`);
    } finally {
      console.log('🔄 Fin du processus de configuration');
      setIsConfiguring(false);
    }
  };

  // On ne montre le loading que pendant le chargement initial des panneaux
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
      <Header title="CONFIGURATION DU PANNEAU" subtitle="Sélectionnez un panneau et configurez le WiFi" />

      <Box
        display="flex"
        flexDirection="column"
        gap={3}
        maxWidth={600}
        mx="auto"
        mt={4}
      >
        <FormControl fullWidth>
          <InputLabel>Panneau solaire</InputLabel>
          <Select
            value={selectedPanel}
            onChange={handlePanelSelect}
            label="Panneau solaire"
          >
            {panels.map((panel) => (
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

        <Typography variant="h6" mt={2}>Informations du panneau</Typography>
        
        <TextField
          fullWidth
          label="Latitude"
          value={deviceInfo.latitude ? `${Number(deviceInfo.latitude).toFixed(6)}°` : ''}
          InputProps={{ 
            readOnly: true,
            endAdornment: <Box component="span" sx={{ color: 'text.secondary', ml: 1 }}>N</Box>
          }}
        />
        
        <TextField
          fullWidth
          label="Longitude"
          value={deviceInfo.longitude ? `${Number(deviceInfo.longitude).toFixed(6)}°` : ''}
          InputProps={{ 
            readOnly: true,
            endAdornment: <Box component="span" sx={{ color: 'text.secondary', ml: 1 }}>E</Box>
          }}
        />
        
        <TextField
          fullWidth
          label="Altitude"
          value={deviceInfo.elevation ? `${Number(deviceInfo.elevation).toFixed(1)}` : ''}
          InputProps={{ 
            readOnly: true,
            endAdornment: <Box component="span" sx={{ color: 'text.secondary', ml: 1 }}>m</Box>
          }}
        />
        
        <TextField
          fullWidth
          label="Token ThingsBoard"
          value={deviceInfo.token}
          InputProps={{ readOnly: true }}
        />

        <TextField
          fullWidth
          label="Device ID ThingsBoard"
          value={deviceInfo.deviceId}
          InputProps={{ readOnly: true }}
        />

        <Typography variant="h6" mt={2}>Configuration WiFi</Typography>

        <TextField
          fullWidth
          label="Nom du réseau WiFi"
          helperText="Le nom du réseau WiFi auquel l'ESP doit se connecter"
          name="networkName"
          value={wifiConfig.networkName}
          onChange={handleWifiChange}
        />

        <TextField
          fullWidth
          label="Mot de passe WiFi"
          helperText="Le mot de passe du réseau WiFi"
          name="ssid"
          type="password"
          value={wifiConfig.ssid}
          onChange={handleWifiChange}
        />

        {!showConfirmButton ? (
          <Button
            fullWidth
            variant="contained"
            color="secondary"
            onClick={handleSubmit}
            disabled={!selectedPanel || !wifiConfig.networkName || !wifiConfig.ssid}
            sx={{ mt: 2 }}
          >
            Sauvegarder la configuration
          </Button>
        ) : (
          <>
            {espConfigOk ? (
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Typography variant="h6" color="success.main">✅ ESP configuré</Typography>
                <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate('/dashboard')}>Retour au dashboard</Button>
              </Box>
            ) : (
              <Button
                fullWidth
                variant="contained"
                color="primary"
                onClick={handleConfirmConfig}
                disabled={isConfiguring}
                sx={{ mt: 2, bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' } }}
              >
                {isConfiguring ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={20} color="inherit" />
                    <span>Configuration en cours...</span>
                  </Box>
                ) : (
                  "Envoyer la configuration à l'ESP"
                )}
              </Button>
            )}
          </>
        )}

        {showConfirmButton && (
          <Box sx={{ mt: 3 }}>
            <Typography
              variant="h6"
              color="success.main"
              sx={{ textAlign: 'center', mb: 2 }}
            >
              ✅ Configuration prête à être envoyée
            </Typography>
            
            {/* Étapes de configuration */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Étapes de configuration :
              </Typography>
              <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2
              }}>
                {/* Étape 1 */}
                <Box sx={{
                  p: 2,
                  bgcolor: configStep === 1 ? 'primary.light' : 'success.light',
                  borderRadius: 1,
                  opacity: configStep > 1 ? 0.7 : 1
                }}>
                  <Typography variant="body1">
                    1. Sauvegarder la configuration ✅
                  </Typography>
                </Box>

                {/* Étape 2 */}
                <Box sx={{
                  p: 2,
                  bgcolor: configStep === 2 ? 'primary.light' : 'grey.100',
                  borderRadius: 1
                }}>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    2. Se connecter au réseau ESP
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    • Connectez-vous au réseau "ESP_XXXX"<br />
                    • Une fois connecté, revenez sur cette page<br />
                    • Vérifiez que l'ESP est allumé et en mode configuration
                  </Typography>
                </Box>

                {/* Étape 3 */}
                <Box sx={{
                  p: 2,
                  bgcolor: configStep === 3 ? 'primary.light' : 'grey.100',
                  borderRadius: 1
                }}>
                  <Typography variant="body1">
                    3. Envoyer la configuration à l'ESP
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default PanelConfig;
