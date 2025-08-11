import { Box, Typography, useTheme, Select, MenuItem, FormControl, InputLabel } from "@mui/material";
import { tokens } from "../../theme";
import Header from "../../components/Header";
import LineChart from "../../components/LineChart";
import BarChart from "../../components/BarChart";
import StatBox from "../../components/StatBox";
import SolarPanel from "../../components/SolarPanel";
import ProgressCircle from "../../components/ProgressCircle";
import GeographyChart from "../../components/GeographyChart";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import { useEffect, useState, useCallback, useRef } from "react";
import io from "socket.io-client";
import { mockTransactions } from "../../data/mockData";

const Dashboard = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const getLastTelemetry = () => {
    const stored = localStorage.getItem("lastTelemetry");
    if (stored) {
      return JSON.parse(stored);
    }
    return {
      temperature: null,
      humidity: null,
      luminosity1: null,
      luminosity2: null,
      luminosity3: null,
    };
  };

  const [selectedPanel, setSelectedPanel] = useState("");  // Initialize with empty string
  const [panels, setPanels] = useState([]);
  const [telemetry, setTelemetry] = useState(getLastTelemetry());
  const socketRef = useRef(null); // Utilisation de useRef pour la socket

  const initializeWebSocket = useCallback(async () => {
    try {
        // Nettoyage de l'ancien socket
        if (socketRef.current && typeof socketRef.current.disconnect === 'function') {
            console.log('Déconnexion de l\'ancien socket');
            // Annulation de l'abonnement à l'ancien deviceId
            const oldDeviceId = localStorage.getItem("tbDeviceId");
            if (oldDeviceId) {
              socketRef.current.emit('unsubscribe', { deviceId: oldDeviceId });
            }
            socketRef.current.disconnect();
            socketRef.current = null;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const deviceId = localStorage.getItem("tbDeviceId");
        const deviceToken = localStorage.getItem("tbDeviceToken");

        if (!deviceId || !deviceToken) {
            console.error('❌ deviceId ou token manquant dans le frontend');
            return null;
        }

        console.log('Tentative de connexion WebSocket avec:', { deviceId, deviceToken });

        const newSocket = io("http://localhost:3001", {
            transports: ["websocket"],
            path: "/socket.io",
            query: { deviceId, token: deviceToken },
            forceNew: true,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5,
            timeout: 20000,
        });

        // Écoute des événements
        newSocket.on(`telemetry:${deviceId}`, (data) => {
            console.log('📥 Données reçues dans le frontend:', data);
            setTelemetry(data.data);
        });

        newSocket.on('connect', () => {
            console.log(`Connecté au serveur WebSocket pour le deviceId ${deviceId}`);
            newSocket.emit('subscribe', { deviceId, token: deviceToken });
        });

        newSocket.on('disconnect', (reason) => {
            console.log(`Déconnecté du deviceId ${deviceId}, raison:`, reason);
        });

        socketRef.current = newSocket;
        return newSocket;
    } catch (error) {
        console.error('Socket initialization error:', error);
        return null;
    }
}, []); // Pas de dépendances nécessaires

  useEffect(() => {
    const fetchPanels = async () => {
      try {
        const token = localStorage.getItem("jwt_token") || localStorage.getItem("jwt");
        const response = await fetch("http://localhost:3001/api/panels/list", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error("Erreur lors du chargement des panneaux");

        const data = await response.json();
        setPanels(Array.isArray(data) ? data : data.panels || []);
        
        // Restaurer le panneau sélectionné seulement s'il existe dans la liste
        const savedPanel = localStorage.getItem("selectedDevice");
        const panelsList = Array.isArray(data) ? data : data.panels || [];
        if (savedPanel && panelsList.some(panel => panel.panel_id === savedPanel)) {
          setSelectedPanel(savedPanel);
        } else {
          setSelectedPanel(""); // Réinitialiser à vide si le panneau sauvegardé n'existe pas
        }
      } catch (err) {
        console.error(err);
        setSelectedPanel(""); // Réinitialiser en cas d'erreur
      }
    };

    fetchPanels();
  }, []);

  useEffect(() => {
    let pollingInterval = null;

    const initSocket = async () => {
      if (selectedPanel) {
        try {
          const newSocket = await initializeWebSocket();

          if (newSocket && typeof newSocket.connected === 'boolean') {
            pollingInterval = setInterval(() => {
              if (newSocket.connected) {
                const deviceId = localStorage.getItem("tbDeviceId");
                if (deviceId) {
                  newSocket.emit("getLastTelemetry", { deviceId });
                }
              } else if (!newSocket.connecting) {
                newSocket.connect();
              }
            }, 5000);
          }
        } catch (error) {
          console.error('Erreur lors de l\'initialisation du socket:', error);
        }
      }
    };

    initSocket();

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      if (socketRef.current && typeof socketRef.current.disconnect === 'function') {
        console.log('Nettoyage et déconnexion du socket');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [selectedPanel, initializeWebSocket]); // Ajout de initializeWebSocket comme dépendance

  const handlePanelSelect = async (event) => {
    const panelId = event.target.value;
    console.log('Sélection du panneau:', panelId);
    const selectedPanelData = panels.find((panel) => panel.panel_id === panelId);
    
    if (selectedPanelData) {
      console.log('Données du panneau trouvées:', selectedPanelData);
      // D'abord déconnecter l'ancien socket s'il existe
      if (socketRef.current && typeof socketRef.current.disconnect === 'function') {
        console.log('Déconnexion du socket existant');
        try {
          // Annulation de l'abonnement à l'ancien deviceId
          const oldDeviceId = localStorage.getItem("tbDeviceId");
          if (oldDeviceId) {
            socketRef.current.emit('unsubscribe', { deviceId: oldDeviceId });
          }
          socketRef.current.disconnect();
          socketRef.current = null;
          await new Promise(resolve => setTimeout(resolve, 1000));
          console.log('Socket déconnecté avec succès');
        } catch (error) {
          console.error('Erreur lors de la déconnexion du socket:', error);
        }
      }

      // Ensuite mettre à jour le localStorage
      try {
        localStorage.setItem("selectedDevice", panelId);
        localStorage.setItem("tbDeviceId", selectedPanelData.device_id_thingsboard);
        localStorage.setItem("tbDeviceToken", selectedPanelData.token_thingsboard);
        console.log('Données sauvegardées dans localStorage:', {
          selectedDevice: panelId,
          tbDeviceId: selectedPanelData.device_id_thingsboard,
          tbDeviceToken: selectedPanelData.token_thingsboard
        });
      } catch (error) {
        console.error('Erreur lors de la sauvegarde dans localStorage:', error);
      }
      
      // Finalement, mettre à jour l'état et initialiser le nouveau socket
      console.log('Mise à jour du panneau sélectionné');
      setSelectedPanel(panelId);
    } else {
      setSelectedPanel("");
    }
  };

  return (
    <Box m="20px">
      {/* HEADER WITH PANEL SELECTOR */}
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Header title="SMART SOLAR TRACKING PANEL" subtitle="Suivi en temps réel de votre installation solaire" />
        <Box width="250px">
          <FormControl fullWidth>
            <InputLabel>Panneau solaire</InputLabel>
            <Select value={selectedPanel} onChange={handlePanelSelect} label="Panneau solaire">
              {panels.map((panel) => (
                <MenuItem key={panel.panel_id} value={panel.panel_id}>
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
        </Box>
      </Box>

      {/* GRID & CHARTS */}
      <Box display="grid" gridTemplateColumns="repeat(12, 1fr)" gridAutoRows="140px" gap="20px">
        {/* ROW 1 */}
        <Box gridColumn="span 3" backgroundColor={colors.primary[400]} display="flex" alignItems="center" justifyContent="center">
          <StatBox title="5.2 kWh" subtitle="Production actuelle" progress="0.85" increase="+8% aujourd'hui" icon={<span role="img" aria-label="Soleil" style={{ fontSize: 26 }}>☀️</span>} />
        </Box>
        <Box gridColumn="span 3" backgroundColor={colors.primary[400]} display="flex" alignItems="center" justifyContent="center">
          <StatBox title={telemetry.temperature != null ? `${Number(telemetry.temperature).toFixed(1)}°C` : "--"} subtitle="Température du panneau" progress="0.60" increase={telemetry.temperature != null ? `${telemetry.temperature}°C` : "N/A"} icon={<span role="img" aria-label="Thermomètre" style={{ fontSize: 26 }}>🌡️</span>} />
        </Box>
        <Box gridColumn="span 3" backgroundColor={colors.primary[400]} display="flex" alignItems="center" justifyContent="center">
          <StatBox title="OK" subtitle="Système opérationnel" progress="1.00" increase="" icon={<span role="img" aria-label="Panneau solaire" style={{ fontSize: 26 }}>☀️</span>} />
        </Box>
        <Box gridColumn="span 4" gridRow="span 2" backgroundColor={colors.primary[400]} display="flex" alignItems="center" justifyContent="center">
          <SolarPanel luminosity1={telemetry.luminosity1} luminosity2={telemetry.luminosity2} luminosity3={telemetry.luminosity3} />
        </Box>

        {/* ROW 2 */}
        <Box gridColumn="span 8" gridRow="span 2" backgroundColor={colors.primary[400]}>
          <Box mt="25px" p="0 30px" display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h5" fontWeight="600" color={colors.grey[100]}>
                Énergie totale produite
              </Typography>
              <Typography variant="h3" fontWeight="bold" color={colors.greenAccent[500]}>
                59,3 kWh
              </Typography>
            </Box>
            <Box>
              <DownloadOutlinedIcon sx={{ fontSize: "26px", color: colors.greenAccent[500] }} />
            </Box>
          </Box>
          <Box height="250px" m="-20px 0 0 0">
            <LineChart isDashboard={true} />
          </Box>
        </Box>
        <Box gridColumn="span 4" gridRow="span 2" backgroundColor={colors.primary[400]} overflow="auto">
          <Box display="flex" justifyContent="space-between" alignItems="center" borderBottom={`4px solid ${colors.primary[500]}`} colors={colors.grey[100]} p="15px">
            <Typography color={colors.grey[100]} variant="h5" fontWeight="600">
              Dernières mesures reçues
            </Typography>
          </Box>
          {mockTransactions.map((transaction, i) => (
            <Box key={`${transaction.txId}-${i}`} display="flex" justifyContent="space-between" alignItems="center" borderBottom={`4px solid ${colors.primary[500]}`} p="15px">
              <Box>
                <Typography color={colors.greenAccent[500]} variant="h5" fontWeight="600">
                  {transaction.txId}
                </Typography>
                <Typography color={colors.grey[100]}>{transaction.user}</Typography>
              </Box>
              <Box color={colors.grey[100]}>{transaction.date}</Box>
              <Box backgroundColor={colors.greenAccent[500]} p="5px 10px" borderRadius="4px">
                {transaction.cost} kWh
              </Box>
            </Box>
          ))}
        </Box>

        {/* ROW 3 */}
        <Box gridColumn="span 4" gridRow="span 2" backgroundColor={colors.primary[400]} p="30px">
          <Typography variant="h5" fontWeight="600">
            Performance solaire
          </Typography>
          <Box display="flex" flexDirection="column" alignItems="center" mt="25px">
            <ProgressCircle size="125" />
            <Typography variant="h5" color={colors.greenAccent[500]} sx={{ mt: "15px" }}>
              48,3 kWh générés ce mois
            </Typography>
            <Typography>Donnees issues de tous les panneaux connectés</Typography>
          </Box>
        </Box>
        <Box gridColumn="span 4" gridRow="span 2" backgroundColor={colors.primary[400]}>
          <Typography variant="h5" fontWeight="600" sx={{ padding: "30px 30px 0 30px" }}>
            Nombre de cycles solaires
          </Typography>
          <Box height="250px" mt="-20px">
            <BarChart isDashboard={true} />
          </Box>
        </Box>
        <Box gridColumn="span 4" gridRow="span 2" backgroundColor={colors.primary[400]} padding="30px">
          <Typography variant="h5" fontWeight="600" sx={{ marginBottom: "15px" }}>
            Production par zone géographique
          </Typography>
          <Box height="200px">
            <GeographyChart isDashboard={true} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;
