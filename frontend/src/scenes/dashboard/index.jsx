import { Box, Typography, useTheme, Select, MenuItem, FormControl, InputLabel } from "@mui/material";
import { tokens } from "../../theme";
import BarChart from "../../components/BarChart";
import SolarBarChart from "../../components/SolarBarChart";
import DashboardHeader from "../../components/DashboardHeader";
import DashboardStats from "../../components/DashboardStats";
import { useEffect, useState, useCallback, useRef } from "react";
import io from "socket.io-client";
import solarmanService from '../../services/solarmanService';
import DashboardCharts from '../../components/DashboardCharts';

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
  // derive selected panel object and deviceSn for child components
  const selectedPanelData = panels.find((p) => p.panel_id === selectedPanel) || null;
  const deviceSn = selectedPanelData ? selectedPanelData.device_sn : null;
  const [telemetry, setTelemetry] = useState(getLastTelemetry()); // température, vent, lum, etc.
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [powerChartData, setPowerChartData] = useState({ usePower: [], generationPower: [] });
  const [monthlyStats, setMonthlyStats] = useState(null);
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
      const deviceSn = localStorage.getItem('deviceSn');
  const resp = await solarmanService.fetchPowerHistory(deviceSn, selectedDate.getFullYear(), selectedDate.getMonth() + 1, selectedDate.getDate());
      const data = resp;
      if (data && Array.isArray(data.records)) {
        console.log('📊 Nombre de points de données:', data.records.length);
        const sortedRecords = [...data.records].sort((a, b) => a.dateTime - b.dateTime);
        const usePowerData = sortedRecords.map(r => r.usePower ?? 0);
        const generationPowerData = sortedRecords.map(r => r.generationPower ?? 0);
        const timeStamps = sortedRecords.map(r => new Date(r.dateTime * 1000).toLocaleTimeString());

        setPowerChartData({
          usePower: usePowerData.map((value, index) => ({ x: timeStamps[index], y: value })),
          generationPower: generationPowerData.map((value, index) => ({ x: timeStamps[index], y: value }))
        });

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

  // When user changes the selected date (from the PowerChart datepicker),
  // immediately fetch history for that date so the chart updates.
  useEffect(() => {
    if (!selectedPanel) return;
    // fetch for the newly selected date
    fetchPowerHistoryData();
  }, [selectedDate, selectedPanel]);

  // Fetch monthly stats for the selected panel/date so the frontend can display monthly production
  useEffect(() => {
    if (!selectedPanel || !selectedDate) return;
    const deviceSn = localStorage.getItem('deviceSn');
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth() + 1;

    solarmanService.getMonthlyPowerStats(deviceSn, year, month)
      .then(res => {
        if (res && res.success) setMonthlyStats(res.data);
        else setMonthlyStats(res);
      })
      .catch(err => {
        console.warn('Unable to fetch monthly stats', err);
        setMonthlyStats(null);
      });
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

  const fetchAllData = useCallback(async (deviceSn) => {
    try {
  return await solarmanService.fetchCurrentDeviceData(deviceSn);
    } catch (error) {
      console.error('Error fetching current device data:', error);
      return null;
    }
  }, []);

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

          // Also persist raw arrays to localStorage so other components/pages can read live data
          try {
            const storedTimes = JSON.parse(localStorage.getItem('timeStamps') || '[]');
            const storedUse = JSON.parse(localStorage.getItem('usePowerData') || '[]');
            const storedGen = JSON.parse(localStorage.getItem('generationPowerData') || '[]');

            const updatedTimes = [...storedTimes, timeStr].slice(-288);
            const updatedUse = [...storedUse, data.usedPower || 0].slice(-288);
            const updatedGen = [...storedGen, data.production || 0].slice(-288);

            localStorage.setItem('timeStamps', JSON.stringify(updatedTimes));
            localStorage.setItem('usePowerData', JSON.stringify(updatedUse));
            localStorage.setItem('generationPowerData', JSON.stringify(updatedGen));
          } catch (e) {
            console.warn('Unable to persist live chart point to localStorage', e);
          }

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
  {/* HEADER WITH PANEL SELECTOR (componentized) */}
  <DashboardHeader panels={panels} selectedPanel={selectedPanel} handlePanelSelect={handlePanelSelect} />

  {/* GRID & CHARTS */}
  {/* Use auto-sized rows so content can collapse without leaving empty holes */}
  <DashboardStats colors={colors} inverterData={inverterData} telemetry={telemetry} telemetryStatus={telemetryStatus} formatTelemetryValue={formatTelemetryValue} />

            <DashboardCharts colors={colors} powerChartData={powerChartData} selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
            {/* Monthly bar chart for selected panel */}
            {deviceSn && (
              <Box mt="20px" backgroundColor={colors.primary[400]} p="20px">
                <Typography variant="h6" fontWeight="600">Production mensuelle (kWh)</Typography>
                <Box height="220px" mt="12px">
                  <SolarBarChart 
  deviceSn={deviceSn} 
  selectedDate={selectedDate} 
  isDashboard={true} 
/>
                </Box>
              </Box>
            )}
    </Box>
  );
};

export default Dashboard;
