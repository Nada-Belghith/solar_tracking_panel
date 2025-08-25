import { Box, Typography, useTheme, Select, MenuItem, FormControl, InputLabel, TextField } from "@mui/material";
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
import axios from 'axios';
import PowerChart from '../../components/PowerChart';

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
      luminosity1: null,
      luminosity2: null,
      luminosity3: null,
      production: null,
      pressure: null,
      windSpeed: null,
    };
  };

  const [selectedPanel, setSelectedPanel] = useState("");  // Initialize with empty string
  const [panels, setPanels] = useState([]);
  const [telemetry, setTelemetry] = useState(getLastTelemetry()); // température, vent, lum, etc.
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [powerChartData, setPowerChartData] = useState({ usePower: [], generationPower: [] });
  const [inverterData, setInverterData] = useState({
  production: null,
  dailyProduction: null,
  totalProduction: null,
  dcPower: null,
  dcVoltage1: null,
  dcVoltage2: null,
  runningHours: null,
  inverterStatus: null
});
  const socketRef = useRef(null); // Utilisation de useRef pour la socket
  const activeDeviceRef = useRef(null); // deviceId actuellement abonné

  // Helper: format telemetry values similarly to LiveTelemetry (toFixed) and provide a small status label
  const formatTelemetryValue = (val, decimals = 1) => {
    if (val === null || typeof val === 'undefined') return null;
    const n = Number(val);
    if (Number.isNaN(n)) return null;
    return n.toFixed(decimals);
  };

  const telemetryStatus = (key, val) => {
    if (val === null || typeof val === 'undefined') return 'N/A';
    const n = Number(val);
    if (Number.isNaN(n)) return 'N/A';
    switch (key) {
      case 'temperature':
        return n > 25 ? 'Élevée' : 'Normale';
      case 'pressure':
        return n > 1013 ? 'Haut' : 'Normal';
      case 'windSpeed':
        return n > 10 ? 'Fort' : 'Faible';
      default:
        return '';
    }
  };

  const fetchPowerHistoryData = useCallback(async () => {
  if (!selectedPanel) return;

  try {
    console.log('🕒 Début de la récupération des données -', new Date().toLocaleString());

    const deviceSn = localStorage.getItem("deviceSn");
    const url = new URL(`http://localhost:3001/solarman/power-history/${deviceSn}`);
    url.searchParams.append('year', selectedDate.getFullYear());
    url.searchParams.append('month', selectedDate.getMonth() + 1);
    url.searchParams.append('day', selectedDate.getDate());

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data && Array.isArray(data.records)) {
      console.log('📊 Nombre de points de données:', data.records.length);

      // Trier par dateTime croissant
      const sortedRecords = [...data.records].sort((a, b) => a.dateTime - b.dateTime);

      // Extraire les listes
      const usePowerData = sortedRecords.map(r => r.usePower ?? 0);
      const generationPowerData = sortedRecords.map(r => r.generationPower ?? 0);
      const timeStamps = sortedRecords.map(r => new Date(r.dateTime * 1000).toLocaleTimeString());

      console.log('⚡ usePowerData:', usePowerData);
      console.log('☀️ generationPowerData:', generationPowerData);
      console.log('🕒 timeStamps:', timeStamps);

      // Store in component state for immediate use
      setPowerChartData({
        usePower: usePowerData.map((value, index) => ({ x: timeStamps[index], y: value })),
        generationPower: generationPowerData.map((value, index) => ({ x: timeStamps[index], y: value }))
      });

      // Persist raw arrays to localStorage so other files/pages can read them
      try {
        localStorage.setItem('usePowerData', JSON.stringify(usePowerData));
        localStorage.setItem('generationPowerData', JSON.stringify(generationPowerData));
        localStorage.setItem('timeStamps', JSON.stringify(timeStamps));
      } catch (e) {
        console.warn('Unable to persist chart data to localStorage:', e);
      }
    }
  } catch (err) {
    console.error('❌ Erreur lors de la récupération de l’historique:', err);
  }
}, [selectedPanel, selectedDate]);

  // Appeler fetchPowerHistoryData quand la fonction change
  useEffect(() => {
    fetchPowerHistoryData();
  }, [fetchPowerHistoryData]);


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
        const handleTelemetry = (data) => {
            try {
                const currentDevice = localStorage.getItem('tbDeviceId');
                // Vérifier que le socket est connecté et que l'abonnement correspond
                if (!socketRef.current || !socketRef.current.connected) return;
                if (!activeDeviceRef.current) return;
                        if (data && data.panelId && data.panelId === activeDeviceRef.current && data.panelId === currentDevice) {
                    console.log('📥 Données affichées dans le dashboard:', {
                        panelId: data.panelId,
                        name: data.name,
                        data: data.data
                    });
                    setTelemetry(data.data);
                }
                // Sinon: ne rien afficher (silencieux) pour éviter le chevauchement
            } catch (err) {
                console.error('Erreur lors du traitement de la télémétrie:', err);
            }
        };
        
        // S'assurer qu'aucun handler en double n'existe
        newSocket.off(`telemetry:${deviceId}`);
        newSocket.on(`telemetry:${deviceId}`, handleTelemetry);

        newSocket.on('connect', () => {
            console.log(`Connecté au serveur WebSocket pour le deviceId ${deviceId}`);
            // Marquer device actif avant de demander la souscription
            activeDeviceRef.current = deviceId;
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
          // Marquer qu'aucun device n'est actif après la déconnexion
          activeDeviceRef.current = null;
          await new Promise(resolve => setTimeout(resolve, 1000));
          console.log('Socket déconnecté avec succès');
        } catch (error) {
          console.error('Erreur lors de la déconnexion du socket:', error);
        }
      }

      // Mettre à jour le localStorage
      try {
        localStorage.setItem("selectedDevice", panelId);
        localStorage.setItem("tbDeviceId", selectedPanelData.device_id_thingsboard);
        localStorage.setItem("tbDeviceToken", selectedPanelData.token_thingsboard);
        localStorage.setItem("deviceSn", selectedPanelData.device_sn);
        console.log('Données sauvegardées dans localStorage:', {
          selectedDevice: panelId,
          tbDeviceId: selectedPanelData.device_id_thingsboard,
          tbDeviceToken: selectedPanelData.token_thingsboard,
          deviceSn: selectedPanelData.device_sn
        });

        // Mettre à jour l'état
        console.log('Mise à jour du panneau sélectionné');
        setSelectedPanel(panelId);
      } catch (error) {
        console.error('Erreur lors de la mise à jour du localStorage:', error);
      }
    } else {
      setSelectedPanel("");
    }
  };

  const getValueFromDataList = useCallback((dataList, key) => {
    const entry = dataList.find(item => item.key === key);
    if (!entry) return null;
    const value = parseFloat(entry.value);
    return isNaN(value) ? entry.value : value;
  }, []);

  const fetchAllData = useCallback(async (deviceSn) => {
    try {
      console.log('Fetching data for deviceSn:', deviceSn);
      const response = await axios.post("http://localhost:3001/solarman/currentData", { deviceSn });
      console.log('Response from currentData:', response);
      
      if (response.data?.success && response.data.dataList) {
        const dataList = response.data.dataList;
        
        // Retourner un objet avec toutes les données organisées
        return {
          // Production actuelle en Watts (APo_t1)
          production: getValueFromDataList(dataList, 'APo_t1') || null,
          // Production journalière en kWh (Etdy_ge1)
          dailyProduction: getValueFromDataList(dataList, 'Etdy_ge1') || null,
          // Production cumulée en kWh (Et_ge0)
          totalProduction: getValueFromDataList(dataList, 'Et_ge0') || null,
          // Température de l'onduleur en °C (INV_T0)
          temperature: getValueFromDataList(dataList, 'INV_T0') || null,
          // Status de l'onduleur (INV_ST1)
          inverterStatus: getValueFromDataList(dataList, 'INV_ST1') || null,
          // Puissance DC des panneaux (DP1 + DP2)
          dcPower: (getValueFromDataList(dataList, 'DP1') || 0) + (getValueFromDataList(dataList, 'DP2') || 0),
          // Tension DC des panneaux (DV1, DV2)
          dcVoltage1: getValueFromDataList(dataList, 'DV1') || null,
          dcVoltage2: getValueFromDataList(dataList, 'DV2') || null,
          // Temps de fonctionnement en heures (t_w_hou1)
          runningHours: getValueFromDataList(dataList, 't_w_hou1') || null,
        };
      }

      console.error("Data not found in response:", response.data);
      return null;
    } catch (error) {
      console.error("Error fetching data:", error.response?.data || error);
      return null;
    }
  }, [getValueFromDataList]);

  // Fetch all data and update telemetry state


  // Ajout de journaux pour diagnostiquer les données de l'onduleur
  // Effect: fetch immediately once to populate inverterData, then poll every 5 minutes
  useEffect(() => {
  const deviceSn = localStorage.getItem("deviceSn");
  let mounted = true;

  const fetchAndSet = async () => {
    if (!deviceSn) return;
    const data = await fetchAllData(deviceSn);
    if (mounted && data) {
      setInverterData(data);
      setTelemetry(prev => ({ ...prev, ...data }));
      
      // Mettre à jour les données de puissance en temps réel si nécessaire
      if (data.production !== undefined || data.usedPower !== undefined) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString();
        setPowerChartData(prev => {
          const newUsePower = [...prev.usePower, {
            x: timeStr,
            y: data.usedPower || 0
          }].slice(-288); // Garder 24h de données (288 points à 5 min d'intervalle)
          
          const newGenerationPower = [...prev.generationPower, {
            x: timeStr,
            y: data.production || 0
          }].slice(-288);

          return {
            usePower: newUsePower,
            generationPower: newGenerationPower
          };
        });
      }
    }
  };

  fetchAndSet(); // appel immédiat

  const interval = setInterval(fetchAndSet, 5 * 60 * 1000); // polling toutes les 5 min

  return () => {
    mounted = false;
    clearInterval(interval);
  };
}, [fetchAllData, selectedPanel]);

  useEffect(() => {
    // Si le mounted n'est pas utilisé, nous pouvons simplement supprimer ce bloc
    // car il n'effectue aucune opération asynchrone nécessitant un flag mounted
  }, []); // empty dependency array

  return (
    <Box m="20px">
      {/* HEADER WITH PANEL SELECTOR */}
      <Box mb="20px">
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
      </Box>

      {/* GRID & CHARTS */}
      <Box display="grid" gridTemplateColumns="repeat(12, 1fr)" gridAutoRows="140px" gap="20px">
        {/* ROW 1 */}
        <Box gridColumn="span 2" backgroundColor={colors.primary[400]} display="flex" alignItems="center" justifyContent="center">
          <StatBox
            title={inverterData.dailyProduction != null ? `${inverterData.dailyProduction} kWh` : "-- kWh"}
            subtitle="Production journalière"
            progress={inverterData.dailyProduction != null ? String(Math.min(1, inverterData.dailyProduction / 10)) : "0.0"}
            increase={inverterData.inverterStatus || ""}
            icon={<span role="img" aria-label="Soleil" style={{ fontSize: 26 }}>☀️</span>}
          />
        </Box>
        <Box gridColumn="span 2" backgroundColor={colors.primary[400]} display="flex" alignItems="center" justifyContent="center">
          <StatBox
            title={formatTelemetryValue(telemetry.temperature) != null ? `${formatTelemetryValue(telemetry.temperature)}°C` : "--"}
            subtitle="Température"
            progress={telemetry.temperature != null ? String(Math.min(1, Number(telemetry.temperature) / 50)) : "0.0"}
            increase={telemetryStatus('temperature', telemetry.temperature)}
            icon={<span role="img" aria-label="Thermomètre" style={{ fontSize: 26 }}>🌡️</span>}
          />
        </Box>
        <Box gridColumn="span 2" backgroundColor={colors.primary[400]} display="flex" alignItems="center" justifyContent="center">
          <StatBox
            title={formatTelemetryValue(telemetry.pressure) != null ? `${formatTelemetryValue(telemetry.pressure)} hPa` : "-- hPa"}
            subtitle="Pression"
            progress={telemetry.pressure != null ? String(Math.min(1, (Number(telemetry.pressure) / 1100))) : "0.0"}
            increase={telemetryStatus('pressure', telemetry.pressure)}
            icon={
              <svg width="26" height="26" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <defs>
                  <linearGradient id="gaugeGrad" x1="0" x2="1">
                    <stop offset="0" stopColor="#4caf50" />
                    <stop offset="0.6" stopColor="#ffeb3b" />
                    <stop offset="1" stopColor="#f44336" />
                  </linearGradient>
                </defs>
                {/* outer light arc */}
                <path d="M8 44 A24 24 0 0 1 56 44" fill="none" stroke="#e0e0e0" strokeWidth="6" strokeLinecap="round" />
                {/* colored arc */}
                <path d="M12 44 A20 20 0 0 1 52 44" fill="none" stroke="url(#gaugeGrad)" strokeWidth="6" strokeLinecap="round" />
                {/* hub */}
                <circle cx="32" cy="44" r="4" fill="#fffefeff" />
                {/* needle */}
                <line x1="32" y1="44" x2="46" y2="26" stroke="#fdf8f8ff" strokeWidth="3" strokeLinecap="round" />
              </svg>
            }
          />
        </Box>
        <Box gridColumn="span 2" backgroundColor={colors.primary[400]} display="flex" alignItems="center" justifyContent="center">
          <StatBox
            title={formatTelemetryValue(telemetry.windSpeed) != null ? `${formatTelemetryValue(telemetry.windSpeed)} m/s` : "-- m/s"}
            subtitle="Vitesse du vent"
            progress={telemetry.windSpeed != null ? String(Math.min(1, Number(telemetry.windSpeed) / 30)) : "0.0"}
            increase={telemetryStatus('windSpeed', telemetry.windSpeed)}
            icon={<img src="/assets/vent.png" alt="Vitesse du vent" style={{ width: 50, height: 50, objectFit: 'contain' }} />}
          />
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
            <Box display="flex" gap="20px" alignItems="center">
              <TextField
                label="Date"
                type="date"
                value={selectedDate.toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                sx={{
                  width: 220,
                  '& .MuiInputBase-root': {
                    color: colors.grey[100],
                  },
                  '& .MuiInputLabel-root': {
                    color: colors.grey[100],
                  },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      borderColor: colors.grey[100],
                    },
                    '&:hover fieldset': {
                      borderColor: colors.greenAccent[500],
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: colors.greenAccent[500],
                    }
                  }
                }}
                InputLabelProps={{
                  shrink: true,
                  sx: {
                    color: colors.grey[100]
                  }
                }}
              />
              <DownloadOutlinedIcon sx={{ fontSize: "26px", color: colors.greenAccent[500], cursor: "pointer" }} />
            </Box>
          </Box>
          <Box height="250px" m="-20px 0 0 0">
            <LineChart 
              isDashboard={true} 
              data={[
                {
                  id: "Production",
                  color: colors.greenAccent[500],
                  data: powerChartData.generationPower
                },
                {
                  id: "Consommation",
                  color: colors.redAccent[500],
                  data: powerChartData.usePower
                }
              ]}
            />
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

      {/* Full width PowerChart */}
      <Box mt="50px" backgroundColor={colors.primary[400]} p="60px">
        <Typography variant="h5" fontWeight="600" gutterBottom>
          Historique Puissance (Production vs Consommation)
        </Typography>
        <Box height="360px">
          <PowerChart data={powerChartData} />
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;
