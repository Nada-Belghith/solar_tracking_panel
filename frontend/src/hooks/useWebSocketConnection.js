import { useState, useEffect, useCallback } from 'react';

const useWebSocketConnection = (panelName, jwtToken) => {
  const [socket, setSocket] = useState(null);
  const [telemetryData, setTelemetryData] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [error, setError] = useState(null);

  const connectWebSocket = useCallback(() => {
    if (!jwtToken || !panelName) {
      console.log("⚠️ Token JWT ou nom du panneau manquant");
      return;
    }

    try {
      console.log("🚀 Initialisation de la connexion WebSocket...");
      const ws = new WebSocket(`ws://localhost:3001?token=${jwtToken}`);

      ws.onopen = () => {
        console.log("🟢 Connecté au serveur WebSocket");
        setConnectionStatus('connected');
        setError(null);

        // Sélectionner le panneau à surveiller
        ws.send(JSON.stringify({
          type: 'SELECT_PANEL',
          panelName: panelName
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          switch (message.type) {
            case 'PANEL_SELECTED':
              console.log("✅ Panneau sélectionné:", message.panelName);
              break;

            case 'TELEMETRY_UPDATE':
              console.log("📊 Nouvelles données reçues:", message.data);
              console.log('🔄 Mise à jour de telemetryData avec:', message.data);
              setTelemetryData(message.data);
              break;

            case 'ERROR':
              console.error("❌ Erreur reçue du serveur:", message.message);
              setError(message.message);
              break;

            default:
              console.log("📩 Message non géré:", message);
          }
        } catch (error) {
          console.error("❌ Erreur lors du traitement du message:", error);
        }
      };

      ws.onclose = (event) => {
        console.log("🔴 Déconnecté du serveur WebSocket:", event.reason);
        setConnectionStatus('disconnected');
        setSocket(null);

        // Tentative de reconnexion après un délai
        setTimeout(() => {
          if (connectionStatus !== 'connected') {
            connectWebSocket();
          }
        }, 5000);
      };

      ws.onerror = (error) => {
        console.error("❌ Erreur WebSocket:", error);
        setError("Erreur de connexion au serveur");
        setConnectionStatus('error');
      };

      setSocket(ws);
      
    } catch (error) {
      console.error("❌ Erreur lors de l'initialisation WebSocket:", error);
      setError(error.message);
      setConnectionStatus('error');
    }
  }, [jwtToken, panelName, connectionStatus]);

  // Établir la connexion WebSocket
  useEffect(() => {
    if (connectionStatus === 'disconnected') {
      connectWebSocket();
    }

    // Nettoyer la connexion lors du démontage
    return () => {
      if (socket) {
        console.log("🧹 Nettoyage de la connexion WebSocket");
        socket.close();
      }
    };
  }, [connectWebSocket, socket, connectionStatus]);

  return {
    telemetryData,
    connectionStatus,
    error
  };
};

export default useWebSocketConnection;
