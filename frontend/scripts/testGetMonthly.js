const axios = require('axios');

// Simple CLI to test getMonthlyPowerStats backend endpoint
// Usage examples:
//   node scripts/testGetMonthly.js --deviceSn=SN123 --year=2025 --month=8
// Or set REACT_APP_API_BASE env var to point to a different backend

function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach(arg => {
    const m = arg.match(/^--([^=]+)=?(.*)$/);
    if (m) args[m[1]] = m[2] || true;
  });
  return args;
}

(async function main() {
  const args = parseArgs();
  const deviceSn = args.deviceSn || args.sn;
  const year = args.year || new Date().getFullYear();
  const month = args.month || (new Date().getMonth() + 1);

  if (!deviceSn) {
    console.error('Missing --deviceSn argument');
    process.exit(2);
  }

  const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';
  const url = `${API_BASE}/solarman/monthly/${encodeURIComponent(deviceSn)}/${year}/${month}`;

  console.log('Requesting', url);
  try {
    const resp = await axios.get(url, { timeout: 15000 });
    console.log('Response status:', resp.status);
    console.log(JSON.stringify(resp.data, null, 2));
  } catch (err) {
    if (err.response) {
      console.error('Backend returned status', err.response.status);
      console.error(JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('Request error:', err.message);
    }
    process.exit(1);
  }
})();
