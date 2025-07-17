-- Script de création de la base de données et de la table pour stocker les télémétries

-- 1. Créer la base de données
CREATE DATABASE solarPanel;

-- 2. Se connecter à la base
\c solarPanel

-- 3. Créer la table telemetry
CREATE TABLE telemetry (
  id SERIAL PRIMARY KEY,
  humidity FLOAT,
  temperature FLOAT,
  created_at TIMESTAMP DEFAULT NOW()
);
