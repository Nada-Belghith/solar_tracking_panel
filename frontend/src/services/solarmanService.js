import axios from 'axios';

const API_BASE =  'http://localhost:3001';

async function getMonthlyPowerStats(deviceSn, year, month) {
	if (!deviceSn) throw new Error('deviceSn is required');
	// backend mounts the solarman router at /solarman (see backend/server.js)
	const url = `${API_BASE}/solarman/monthly/${encodeURIComponent(deviceSn)}/${year}/${month}`;
	const resp = await axios.get(url);
	return resp.data;
}

async function fetchPowerHistory(deviceSn, year, month, day) {
	if (!deviceSn) throw new Error('deviceSn is required');
	const url = `${API_BASE}/solarman/power-history/${deviceSn}`;
	const params = { year, month, day };
	const resp = await axios.get(url, { params });
	return resp.data;
}

async function fetchCurrentDeviceData(deviceSn) {
	if (!deviceSn) throw new Error('deviceSn is required');
	const url = `${API_BASE}/solarman/currentData`;
	const resp = await axios.post(url, { deviceSn });
	if (!resp.data?.success || !resp.data?.dataList) {
		throw new Error('Invalid response from currentData');
	}

	const dataList = resp.data.dataList;
	const getValueFromDataList = (dataList, key) => {
		if (!Array.isArray(dataList)) return null;
		const entry = dataList.find(item => item.key === key);
		if (!entry) return null;
		const value = parseFloat(entry.value);
		return Number.isNaN(value) ? entry.value : value;
	};

	return {
		production: getValueFromDataList(dataList, 'APo_t1') || null,
		dailyProduction: getValueFromDataList(dataList, 'Etdy_ge1') || null,
		totalProduction: getValueFromDataList(dataList, 'Et_ge0') || null,
		temperature: getValueFromDataList(dataList, 'INV_T0') || null,
		inverterStatus: getValueFromDataList(dataList, 'INV_ST1') || null,
		dcPower: (getValueFromDataList(dataList, 'DP1') || 0) + (getValueFromDataList(dataList, 'DP2') || 0),
		dcVoltage1: getValueFromDataList(dataList, 'DV1') || null,
		dcVoltage2: getValueFromDataList(dataList, 'DV2') || null,
		runningHours: getValueFromDataList(dataList, 't_w_hou1') || null,
		usedPower: getValueFromDataList(dataList, 'E_Puse_t1') || null,
		gridStatus: getValueFromDataList(dataList, 'ST_PG1') || null,
		cumulativeGridFeedIn: getValueFromDataList(dataList, 't_gc1') || null,
		cumulativeEnergyPurchased: getValueFromDataList(dataList, 'Et_pu1') || null,
	};
}

export default {
	getMonthlyPowerStats,
	fetchPowerHistory,
	fetchCurrentDeviceData
};
