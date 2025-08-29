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

const PowerChart = ({ data, ySegmentCm, selectedDate, setSelectedDate }) => {
  // If no data prop is provided, try to read persisted arrays from localStorage
  let usePower = [];
  let generationPower = [];

  // helper: parse various time formats into a numeric hour value (0..24)
  const parseTimeToHour = (t) => {
    if (t == null) return null;
    // already a number (hour float)
    if (typeof t === 'number' && !Number.isNaN(t)) return t;
    // Date instance
    if (t instanceof Date && !Number.isNaN(t.getTime())) {
      return t.getHours() + t.getMinutes() / 60 + t.getSeconds() / 3600;
    }
    // strings like 'HH:mm' or 'HH:mm:ss'
    if (typeof t === 'string') {
      const m = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
      if (m) {
        const hh = parseInt(m[1], 10);
        const mm = parseInt(m[2], 10);
        const ss = m[3] ? parseInt(m[3], 10) : 0;
        return hh + mm / 60 + ss / 3600;
      }
      // try Date.parse for full date strings
      const parsed = Date.parse(t);
      if (!Number.isNaN(parsed)) {
        const d = new Date(parsed);
        return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
      }
    }
    return null;
  };

  if (data && data.usePower && data.generationPower) {
    // normalize incoming datasets: convert x to hour number and y to number
    usePower = data.usePower.map(p => ({ x: parseTimeToHour(p.x), y: Number(p.y) || 0 })).filter(p => p.x !== null);
    generationPower = data.generationPower.map(p => ({ x: parseTimeToHour(p.x), y: Number(p.y) || 0 })).filter(p => p.x !== null);
  } else {
    try {
      const useRaw = JSON.parse(localStorage.getItem('usePowerData') || '[]');
      const genRaw = JSON.parse(localStorage.getItem('generationPowerData') || '[]');
      const times = JSON.parse(localStorage.getItem('timeStamps') || '[]');

      // map to numeric hours (0..24) for x and numeric y
      usePower = useRaw.map((v, i) => ({ x: parseTimeToHour(times[i]), y: Number(v) || 0 })).filter(p => p.x !== null);
      generationPower = genRaw.map((v, i) => ({ x: parseTimeToHour(times[i]), y: Number(v) || 0 })).filter(p => p.x !== null);
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
        // backgroundColor will be set via a canvas gradient in the options/props below
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return 'rgba(75,192,192,0.12)';
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(75,192,192,0.20)');
          gradient.addColorStop(1, 'rgba(75,192,192,0.02)');
          return gradient;
        },
  tension: 0.4,
  fill: true,
  pointRadius: 0, // hide points
  pointHoverRadius: 0, // no hover 'pop' effect
  pointHitRadius: 8,
      },
      {
        label: 'Puissance consommée',
        data: usePower,
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return 'rgba(255,99,132,0.08)';
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(255,99,132,0.12)');
          gradient.addColorStop(1, 'rgba(255,99,132,0.02)');
          return gradient;
        },
  tension: 0.4,
  fill: false,
  pointRadius: 0,
  pointHoverRadius: 0,
  pointHitRadius: 8,
      },
    ],
  };
  // compute y-axis max based on data and round to nearest 500
  const allValues = [...generationPower, ...usePower].map(p => (p && p.y) || 0);
  const maxVal = allValues.length ? Math.max(...allValues) : 2500;
  const yStep = 500;
  const yMax = Math.max(500, Math.ceil(maxVal / yStep) * yStep);
  const xStep = 3;
  const xMax =24;
  // explicit tick values at 0,3,6,...,24
  const explicitXTicks = Array.from({ length: Math.floor(xMax / xStep) + 1 }, (_, i) => i * xStep);
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      // hide internal legend/title so chart uses full box area (we render headers in the page)
      legend: { display: false },
      tooltip: {
        callbacks: {
          // Title shows both decimal hour and HH:mm
          title: (items) => {
            if (!items || items.length === 0) return '';
            const x = items[0].parsed.x;
            if (typeof x === 'number' && !Number.isNaN(x)) {
              const hh = Math.floor(x);
              const mm = Math.round((x - hh) * 60);
              const hhStr = String(hh).padStart(2, '0');
              const mmStr = String(mm).padStart(2, '0');
              return `${hhStr}:${mmStr}`;
            }
            return String(x);
          },
          label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y} W`,
        },
        intersect: false,
        mode: 'nearest'
      },
  title: { display: false },
    },
  // remove internal padding and spacing
  layout: { padding: 0 },
  scales: {
      x: {
        type: 'linear',
        title: { display: true, text: 'Heure (H)' , color: 'rgba(210, 193, 193, 1)'},
        min: 0,
        max: xMax,
        ticks: {
          callback: (value) => {
            // value is hour (0-24)
            return String(value).padStart(2, '0') + ':00';
          },
          values: explicitXTicks
        },
        grid: { color: 'rgba(210, 193, 193, 0.57)' }
      },
      y: {
        title: { display: true, text: 'Puissance (W)', color: 'rgba(210, 193, 193, 1)' },
        beginAtZero: true,
        max: yMax,
        ticks: {
          stepSize: yStep,
        },
        grid: { color: 'rgba(210, 193, 193, 0.57)' }
      }
    }
  };

  // If caller provided ySegmentCm (height in cm per 500W), compute canvas height
  const wrapperStyle = { width: '100%' };
  if (typeof ySegmentCm === 'number' && ySegmentCm > 0) {
    // CSS cm to px conversion (approx at 96 DPI)
    const pxPerCm = 37.7952755906;
    const segments = Math.max(1, yMax / 500);
    const heightPx = Math.min(1600, Math.max(200, Math.ceil(segments * ySegmentCm * pxPerCm + 60)));
    wrapperStyle.height = `${heightPx}px`;
  } else {
    wrapperStyle.height = '100%';
  }

  return (
    <div style={{ ...wrapperStyle, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: 8 }}>
        {selectedDate && setSelectedDate && (
          <input
            type="date"
            value={selectedDate.toISOString().split('T')[0]}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.06)', padding: '6px 10px', borderRadius: 4 }}
          />
        )}
      </div>
      <div style={{ flex: 1, height: '100%', width: '100%' }}>
        <Line data={chartData} options={options} style={{ height: '100%', width: '100%' }} />
      </div>
    </div>
  );
};

export default PowerChart;
