Test scripts for frontend services

Run the monthly stats test (PowerShell example):

```powershell
# from frontend folder
$env:REACT_APP_API_BASE = 'http://localhost:3001'; node .\scripts\testGetMonthly.js --deviceSn=YOUR_SN --year=2025 --month=8
```

Arguments:
--deviceSn (required): serial number of the device
--year (optional): numeric year
--month (optional): numeric month (1-12)

Set REACT_APP_API_BASE to point to a different backend if needed.
