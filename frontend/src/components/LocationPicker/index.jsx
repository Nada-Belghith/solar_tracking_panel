import React, { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat, transform } from 'ol/proj';
import { Point } from 'ol/geom';
import { Feature } from 'ol';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { Style, Icon } from 'ol/style';

const LocationPicker = ({ onLocationSelect, initialLocation }) => {
  const mapRef = useRef();
  const [map, setMap] = useState(null);
  const [markerLayer, setMarkerLayer] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);

  useEffect(() => {
    // Initialize map
    const initialMap = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM()
        })
      ],
      view: new View({
        center: fromLonLat([3.042048, 36.752887]), // Default center on Algiers
        zoom: 6
      })
    });

    // Create vector layer for marker
    const vectorSource = new VectorSource();
    const vectorLayer = new VectorLayer({
      source: vectorSource
    });
    initialMap.addLayer(vectorLayer);

    setMap(initialMap);
    setMarkerLayer(vectorLayer);

    // If initial location is provided, add marker
    if (initialLocation) {
      const { longitude, latitude } = initialLocation;
      addMarker(vectorLayer, [longitude, latitude]);
    }

    return () => {
      initialMap.setTarget(null);
    };
  }, []);

  useEffect(() => {
    if (!map) return;

    const handleClick = async (event) => {
      const coords = map.getCoordinateFromPixel(event.pixel);
      const lonlat = transform(coords, 'EPSG:3857', 'EPSG:4326');
      
      // Clear previous markers
      markerLayer.getSource().clear();
      
      // Add new marker
      addMarker(markerLayer, lonlat);

      try {
        // Obtenir l'altitude depuis l'API Open-Elevation
        const elevationResponse = await fetch(`https://api.open-elevation.com/api/v1/lookup?locations=${lonlat[1]},${lonlat[0]}`);
        const elevationData = await elevationResponse.json();
        const elevation = elevationData.results?.[0]?.elevation || 0;

        // Obtenir l'adresse depuis Nominatim
        const nominatimResponse = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lonlat[1]}&lon=${lonlat[0]}&zoom=18&addressdetails=1`,
          {
            headers: {
              'Accept-Language': 'fr'
            }
          }
        );
        const addressData = await nominatimResponse.json();
        const address = addressData.display_name;

        const locationData = {
          longitude: lonlat[0],
          latitude: lonlat[1],
          elevation: elevation,
          address: address,
          coordinates: {
            lng: lonlat[0].toFixed(6),
            lat: lonlat[1].toFixed(6),
            alt: elevation.toFixed(2)
          }
        };
        setSelectedLocation(locationData);
        onLocationSelect(locationData);
      } catch (error) {
        console.error('Erreur lors de la récupération de l\'altitude:', error);
        // Notify parent component with just coordinates if elevation fails
        onLocationSelect({
          longitude: lonlat[0],
          latitude: lonlat[1],
          elevation: 0,
          coordinates: {
            lng: lonlat[0].toFixed(6),
            lat: lonlat[1].toFixed(6),
            alt: '0'
          }
        });
      }
    };

    map.on('click', handleClick);

    return () => {
      map.un('click', handleClick);
    };
  }, [map, markerLayer, onLocationSelect]);

  const addMarker = (layer, coordinates) => {
    const marker = new Feature({
      geometry: new Point(fromLonLat(coordinates))
    });

    marker.setStyle(
      new Style({
        image: new Icon({
          anchor: [0.5, 1],
          src: '/assets/marker-icon.png'
        })
      })
    );

    layer.getSource().addFeature(marker);
  };

  return (
    <Box>
      <Box
        ref={mapRef}
        sx={{
          width: '100%',
          height: '400px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          position: 'relative',
          cursor: 'crosshair',
          '&::before': {
            content: '"Cliquez sur la carte pour sélectionner un emplacement"',
            position: 'absolute',
            top: 10,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '8px 16px',
            borderRadius: '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            zIndex: 1000,
            display: !selectedLocation ? 'block' : 'none'
          }
        }}
      />
      
    </Box>
  );
};

export default LocationPicker;
