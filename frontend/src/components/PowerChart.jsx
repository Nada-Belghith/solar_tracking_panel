import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale } from 'chart.js';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

const PowerChart = ({ data }) => {
  // If no data prop is provided, try to read persisted arrays from localStorage
  let usePower = [];
  let generationPower = [];

  if (data && data.usePower && data.generationPower) {
    usePower = data.usePower;
    generationPower = data.generationPower;
  } else {
    try {
      const useRaw = JSON.parse(localStorage.getItem('usePowerData') || '[]');
      const genRaw = JSON.parse(localStorage.getItem('generationPowerData') || '[]');
      const times = JSON.parse(localStorage.getItem('timeStamps') || '[]');

      // map to {x: time, y: value}
      usePower = useRaw.map((v, i) => ({ x: times[i] || null, y: v }));
      generationPower = genRaw.map((v, i) => ({ x: times[i] || null, y: v }));
    } catch (e) {
      console.warn('PowerChart: unable to read persisted chart data', e);
      usePower = [];
      generationPower = [];
    }
  }

  const chartData = {
    datasets: [
      {
        label: 'Puissance solaire',
        data: generationPower,
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.12)',
        tension: 0.4,
        fill: true,
        pointRadius: 2,
      },
      {
        label: 'Puissance consommée',
        data: usePower,
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.12)',
        tension: 0.4,
        fill: false,
        pointRadius: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y} W`,
        },
      },
      title: {
        display: true,
        text: 'Historique Puissance (Production vs Consommation)',
      },
    },
    scales: {
      x: {
        type: 'time',
        time: {
          parser: 'HH:mm:ss',
          unit: 'hour',
          displayFormats: { hour: 'HH:mm' },
          min: '05:00:00',
          max: '19:00:00'
        },
        title: {
          display: true,
          text: 'Heure',
        },
        grid: { display: true }
      },
      y: {
        title: { display: true, text: 'Puissance (W)' },
        beginAtZero: true,
        grid: { display: true }
      }
    }
  };

  return <Line data={chartData} options={options} />;
};

export default PowerChart;
