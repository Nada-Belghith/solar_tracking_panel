# ☀️ Solar Panel Smart Tracking & Monitoring System 🚀

🌞 IoT • STM32 • ESP32 • ThingsBoard • WebApp • SPA Algorithm

## Description du projet

Ce projet consiste à développer un système intelligent de suivi et de monitoring des panneaux solaires, combinant électronique embarquée, communication IoT et interface web de supervision.

L’objectif est de :

- 🌞 Optimiser l’orientation des panneaux en utilisant l’algorithme SPA (Sun Position Algorithm).
- 📡 Assurer un monitoring temps réel grâce à une passerelle IoT basée sur ESP32.
- ☁️ Centraliser les données sur ThingsBoard pour l’analyse énergétique.
- 🖥️ Offrir une WebApp moderne pour la gestion des installations, onduleurs et cartes IoT.

## Architecture générale

Le système est composé de quatre blocs principaux :

### 1. STM32 – Module embarqué 🔧

- Acquisition des valeurs capteurs toutes les 15 minutes.
- Calcul de la position du soleil via SPA.
- Gestion du RTC (temps réel).
- Communication UART avec l’ESP32.

### 2. ESP32 – Passerelle IoT 📶

- Connexion WiFi + mode AP en fallback.
- Envoi des données vers ThingsBoard via MQTT.
- Interface Web locale (192.168.4.1) pour configuration.
- Synchronisation NTP et transmission de l’heure au STM32.

### 3. Cloud ThingsBoard ☁️

- Réception des télémétries depuis ESP32.
- Stockage TimeSeries.
- Dashboards temps réel.

### 4. Web Application 🌐

- Interface graphique développée en React.js.
- Backend Express.js (API REST + WebSockets).
- Gestion utilisateurs, installations, onduleurs.
- Connexion directe aux ESP32 en mode AP.

## Fonctionnement global

Le STM32 lit les capteurs et calcule la position du soleil.
Les données sont envoyées par UART vers l’ESP32.
L’ESP32 transmet les télémétries vers ThingsBoard via MQTT.
La WebApp permet la configuration des cartes et la consultation des dashboards.

## Structure du projet

```
SolarPanelTracking/
│── stm32_firmware/
│   ├── Core/
│   ├── Drivers/
│   └── spa_library/
│
│── esp32_firmware/
│   ├── src/
│   ├── data/ (WebApp locale)
│
│── webapp/
│   ├── backend/
│   ├── frontend/
│
│── documentation/
│   ├── UML/
│   └── synoptique/
│
└── README.md
```

## Image d’illustration 🖼️


![Aperçu du système](\frontend\public\assets\dashboard.png)


## Technologies utilisées ⚙️

- STM32CubeIDE, HAL, UART, RTC
- ESP32 Arduino Framework, WiFi, WebServer, MQTT, NTP
- ThingsBoard IoT Platform
- React.js, Express.js, WebSockets, PostgreSQL
- API Solarman Sofar
- SPA Solar Position Algorithm

## Résultats obtenus ✅

- ✅ Transmission fiable des télémétries capteurs.
- 🎯 Calcul précis de la position solaire.
- 🏗️ Architecture IoT robuste et évolutive.
- 📊 Visualisation temps réel et analyse historique.

---

Pour remplacer l'image par une capture de votre tableau de bord, mettez simplement un fichier `system_overview.svg` ou `system_overview.png` dans le dossier `img/` à la racine du projet.

Si vous voulez, je peux créer une image placeholder SVG maintenant pour que l'image apparaisse immédiatement dans le README.
# solar_panel
 
