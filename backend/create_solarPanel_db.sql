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
  luminosity1 FLOAT,
  luminosity2 FLOAT,
  luminosity3 FLOAT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Créer la table users
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255),
  google_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Créer la table clients
CREATE TABLE clients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  cin VARCHAR(8) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  installation_date DATE,
  status VARCHAR(20) DEFAULT 'en attente',
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  elevation DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW(),
  user_id INTEGER REFERENCES users(id),
  CONSTRAINT valid_coordinates CHECK (
    latitude BETWEEN -90 AND 90 AND
    longitude BETWEEN -180 AND 180
  )
);
CREATE TABLE solar_panel (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  device_id_thingsboard VARCHAR(255) NOT NULL UNIQUE,
  token_thingsboard VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
