import { useState, useEffect } from 'react';

export const usePanelSelection = () => {
  const [selectedPanelId, setSelectedPanelId] = useState(localStorage.getItem('selectedDevice') || '');
  const [selectedPanelName, setSelectedPanelName] = useState('');

  const panels = [
    { id: 'panel1', name: 'Panneau Solaire 1' },
    { id: 'panel2', name: 'Panneau Solaire 2' },
    { id: 'panel3', name: 'Panneau Solaire 3' },
  ];

  useEffect(() => {
    if (selectedPanelId) {
      const panel = panels.find(p => p.id === selectedPanelId);
      setSelectedPanelName(panel ? panel.name : 'Panneau inconnu');
      localStorage.setItem('selectedDevice', selectedPanelId);
    } else {
      setSelectedPanelName('');
      localStorage.removeItem('selectedDevice');
    }
  }, [selectedPanelId]);

  const selectPanel = (panelId) => {
    setSelectedPanelId(panelId);
  };

  return {
    selectedPanelId,
    selectedPanelName,
    selectPanel,
    panels
  };
};
