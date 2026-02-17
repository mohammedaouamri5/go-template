# CSV Polling System

## How It Works

Your heap profiler now supports **server-side CSV polling** with the following features:

### 1. **Client Provides Path**
- Input the absolute path to your CSV file in the UI
- Example: `/home/user/heap-profile.csv` or `C:\data\heap.csv`

### 2. **Server Polls Every 30 Seconds**
- Click "▶ Start Poll" to begin polling
- The server reads the CSV file from the provided path every 30 seconds
- Updates are automatically reflected in the profiler UI
- Live indicator shows polling is active

### 3. **Select Build ID**
- Use the "Build" dropdown to filter data by BuildID
- The dropdown automatically populates with all BuildIDs found in your CSV
- Selected build filters all charts and tables in real-time

## CSV Format

Your CSV must have these columns:
```
Flat,Flat%,Sum%,Cum,Cum%,Name,Time,BuildID,BuildTime
512.5kB,12.3%,,625.8kB,15.2%,runtime.mallocgc,2025-02-11T10:30:00Z,build-20250211-abc123,2025-02-11T10:00:00Z
```

### Column Meanings:
- **Flat**: Current heap size (can be kB, MB, GB)
- **Flat%**: Percentage of flat heap
- **Cum**: Cumulative size including children
- **Cum%**: Cumulative percentage
- **Name**: Function/allocation name
- **Time**: Timestamp of snapshot (ISO format)
- **BuildID**: Unique identifier for the build (used for filtering)
- **BuildTime**: When the build was created

## Usage

1. **Start Polling**
   ```
   1. Enter the full path to your CSV file
   2. Click "▶ Start Poll"
   3. Green indicator shows polling is active
   4. Data updates automatically every 30 seconds
   ```

2. **Stop Polling**
   ```
   Click "⏹ Stop Poll" to stop reading the file
   ```

3. **Filter by Build**
   ```
   Use the Build dropdown to view metrics for a specific build
   ```

4. **Change Polling Frequency**
   - Edit `/app/page.tsx` line ~52
   - Change `30000` (milliseconds) to your desired interval

## API Endpoint

The server exposes an API for CSV reading:

```
GET /api/csv?path=/path/to/file.csv
```

**Response:**
```json
{
  "success": true,
  "data": "CSV file contents...",
  "timestamp": "2025-02-11T10:30:00Z"
}
```

**Error Response:**
```json
{
  "error": "Failed to read CSV file",
  "details": "Check if the file path is correct and accessible"
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Failed to read CSV file" | Check file path is correct and server has read access |
| Data not updating | Click "Stop Poll" and "Start Poll" again |
| No BuildID filter options | Verify BuildID column exists in your CSV |
| Polling stopped unexpectedly | Check console for errors; file may be locked or deleted |

## Performance Tips

- For large CSV files (>50MB), the server may take time to read
- Keep polling interval at 30+ seconds to avoid excessive I/O
- Only one polling session at a time is recommended
