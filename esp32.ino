#include <WiFi.h>
#include <WebServer.h>
#include <ThingsBoard.h>
#include <Arduino_MQTT_Client.h>
#include <Preferences.h>
#include <ESP32Servo.h>
#include <ArduinoJson.h>
#include <time.h>   // ⏱️ Pour NTP

#define TB_SERVER "thingsboard.cloud"

Preferences preferences;
WiFiClient espClient;
Arduino_MQTT_Client mqttClient(espClient);
ThingsBoard tb(mqttClient, 512);

WebServer server(80);
bool apMode = false;

String ssid, password;
String inputString = ""; 
String token, longitude, latitude, elevation;
unsigned long lastWiFiRetry = 0;
const unsigned long retryInterval = 30000; // 30 secondes

void setupTime() {
  configTime(3600, 0, "pool.ntp.org", "time.nist.gov");  // 3600 = GMT+1 ; ajuste selon ta zone
  Serial.println("⏳ Synchronisation de l'heure avec NTP...");

  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    Serial.println("❌ Échec de synchronisation NTP.");
    return;
  }

  Serial.println("✅ Temps NTP synchronisé !");
}


void startAPMode() {
  Serial.println("🔧 Démarrage en mode AP...");
  WiFi.disconnect(true); // forcer déconnexion
  delay(1000);
  WiFi.softAP("ESP32_Config", "12345678");
  IPAddress IP = WiFi.softAPIP();
  Serial.print("AP IP: ");
  Serial.println(IP);

 server.on("/save", HTTP_POST, []() {
    Serial.println("\n📥 Réception des données de configuration :");
    
    ssid = server.arg("ssid");
    password = server.arg("pass");
    token = server.arg("token");
    longitude = server.arg("longitude");
    latitude = server.arg("latitude");
    elevation = server.arg("elevation");

    // Afficher les valeurs reçues
    Serial.println("\n--- Configuration reçue ---");
    Serial.printf("SSID: %s\n", ssid.c_str());
    Serial.printf("Password: %s\n", "********");  // Pour la sécurité
    Serial.printf("Token: %s\n", token.c_str());
    Serial.printf("Longitude: %s\n", longitude.c_str());
    Serial.printf("Latitude: %s\n", latitude.c_str());
    Serial.printf("Elevation: %s\n", elevation.c_str());
    Serial.println("------------------------\n");

    preferences.begin("wifi", false);
    preferences.putString("ssid", ssid);
    preferences.putString("pass", password);
    preferences.putString("token", token);
    preferences.putString("longitude", longitude);
    preferences.putString("latitude", latitude);
    preferences.putString("elevation", elevation);
    preferences.end();

    Serial.println("✅ Configuration sauvegardée");
    
    server.send(200, "text/plain", "Configuration sauvegardée avec succès !");
    
    Serial.println("🔄 Redémarrage dans 3 secondes...");
    delay(3000);
    ESP.restart();
  });
  server.begin();
  apMode = true;
}

bool connectToWiFi() {
   preferences.begin("wifi", true);
   ssid = preferences.getString("ssid", "");
   password = preferences.getString("pass", "");
   token = preferences.getString("token", "");
   longitude = preferences.getString("longitude", "");
   latitude = preferences.getString("latitude", "");
   elevation = preferences.getString("elevation", "");
   preferences.end();

  if (ssid == "" || password == "") return false;

  Serial.printf("📶 Connexion à %s...\n", ssid.c_str());
  WiFi.begin(ssid.c_str(), password.c_str());

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("✅ Wi-Fi connecté !");
    return true;
  }
  return false;
}

void connectToThingsBoard() {
  if (!tb.connected()) {
    Serial.println("Connexion à ThingsBoard...");
    if (!tb.connect(TB_SERVER, token.c_str())) {
      Serial.println("❌ Échec connexion à ThingsBoard");
    } else {
      Serial.println("✅ Connecté à ThingsBoard");
    }
  }
}


void sendLuminosityDataToThingsBoard(int l1, int l2, int l3) {
  Serial.println("Envoi des données à ThingsBoard...");

  bool s1 = tb.sendTelemetryData("luminosity1", l1);
  bool s2 = tb.sendTelemetryData("luminosity2", l2);
  bool s3 = tb.sendTelemetryData("luminosity3", l3);

  if (s1 && s2 && s3) {
    Serial.println("✅ Toutes les données envoyées !");
  } else {
    Serial.println("❌ Échec d'envoi !");
  }
}

void setup() {
  Serial.begin(115200);

  if (!connectToWiFi()) {
    startAPMode();  // pas de WiFi : mode AP direct
  } else {
    connectToThingsBoard();
    setupTime();  // ⚠️ À appeler seulement si Wi-Fi OK

  }
}

void loop() {
    if (apMode) {
    server.handleClient();

    // Vérifier périodiquement si le WiFi est revenu
    if (millis() - lastWiFiRetry > retryInterval) {
      Serial.println("🔄 Nouvelle tentative de connexion Wi-Fi en mode AP...");
      lastWiFiRetry = millis();
      if (connectToWiFi()) {
        Serial.println("✅ Connexion réussie. Arrêt du mode AP...");
        WiFi.softAPdisconnect(true);
        apMode = false;
        server.stop();
        connectToThingsBoard();
      }
    }
    return;
  }

  // Si en mode station, vérifier la connexion
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ Perte de connexion Wi-Fi. Tentatives...");
    int retryCount = 0;
    while (!connectToWiFi() && retryCount < 3) {
      retryCount++;
      delay(3000);
    }

    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("⚠️ Échec. Passage en mode AP");
      startAPMode();
      return;
    }
  }

  // Lire la ligne JSON reçue
  while (Serial2.available()) {
    char c = Serial2.read();
    Serial.print(c);
    if (c == '\n') {  // Fin d'une ligne
      Serial.print("Reçu : ");
      Serial.println(inputString);

      // Parse JSON
      StaticJsonDocument<200> doc;
      DeserializationError err = deserializeJson(doc, inputString);
      if (err) {
        Serial.print("❌ Erreur JSON : ");
        Serial.println(err.c_str());
      } else {
        int l1 = doc["ldr1"];
        int l2 = doc["ldr2"];
        int l3 = doc["ldr3"];

        Serial.printf("Parsed => l1: %d | l2: %d | l3: %d\n", l1, l2, l3);

        if (tb.connected()) {
            delay(1000);
          sendLuminosityDataToThingsBoard(l1, l2, l3);
        } else {
          connectToThingsBoard();
        }
      }

      inputString = "";  // Réinitialiser
    } else {
      inputString += c;
    }
  }

  tb.loop();  // nécessaire pour ThingsBoard
   
}
