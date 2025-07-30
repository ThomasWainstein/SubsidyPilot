# 🔧 Tika Server Setup & Management Guide

## 🚀 Quick Start

### 1. Start Tika Server (Recommended Method)

```bash
# Using the included server manager
python tika_server_manager.py start

# Or manually with Java
java -jar tika-server-standard-3.1.0.jar --port=9998 --host=localhost
```

### 2. Verify Server Health

```bash
# Check if server is running
python tika_server_manager.py status

# Or test manually
curl http://localhost:9998/tika/version
```

### 3. Stop Server

```bash
python tika_server_manager.py stop
```

## 📋 Server Management Commands

| Command | Description | Example |
|---------|-------------|---------|
| `start` | Start Tika server on port 9998 | `python tika_server_manager.py start` |
| `stop` | Stop running Tika server | `python tika_server_manager.py stop` |
| `status` | Check server health and version | `python tika_server_manager.py status` |
| `restart` | Stop and restart server | `python tika_server_manager.py restart` |

## 🔍 Troubleshooting Common Issues

### Issue 1: Connection Refused (Errno 111)
**Symptoms:** `Failed to establish a new connection: [Errno 111] Connection refused`

**Solutions:**
```bash
# Check if server is running
netstat -tuln | grep 9998

# Start server if not running
python tika_server_manager.py start

# Check firewall settings
sudo ufw status
```

### Issue 2: HTTP 405 Method Not Allowed
**Symptoms:** `Tika server responded with status 405`

**Root Cause:** Using wrong HTTP method or endpoint

**Fix Applied:** Pipeline now uses:
- **GET** request to `/tika/version` for health checks
- **PUT** request to `/tika` for text extraction with `Content-Type: application/pdf`

### Issue 3: Read Timeout Errors
**Symptoms:** `Read timed out. (read timeout=60)`

**Solutions:**
- ✅ **Fixed:** Pipeline now has retry logic with exponential backoff
- ✅ **Fixed:** PDF preprocessing reduces file complexity
- ✅ **Fixed:** OCR fallback for scanned documents

## 🏗️ Manual Installation

### Download Tika Server JAR

```bash
# Download latest stable version
wget https://archive.apache.org/dist/tika/3.1.0/tika-server-standard-3.1.0.jar

# Or use curl
curl -O https://archive.apache.org/dist/tika/3.1.0/tika-server-standard-3.1.0.jar
```

### Start Server Manually

```bash
# Basic startup
java -jar tika-server-standard-3.1.0.jar --port=9998

# With additional memory for large files
java -Xmx2g -jar tika-server-standard-3.1.0.jar --port=9998

# Run in background
nohup java -jar tika-server-standard-3.1.0.jar --port=9998 > tika.log 2>&1 &
```

## ⚙️ Production Configuration

### Systemd Service (Linux)

Create `/etc/systemd/system/tika-server.service`:

```ini
[Unit]
Description=Apache Tika Server
After=network.target

[Service]
Type=simple
User=agritool
WorkingDirectory=/opt/tika
ExecStart=/usr/bin/java -Xmx2g -jar tika-server-standard-3.1.0.jar --port=9998 --host=localhost
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable tika-server
sudo systemctl start tika-server
sudo systemctl status tika-server
```

### Docker Alternative

```dockerfile
# Dockerfile for Tika server
FROM openjdk:17-jre-slim

RUN wget https://archive.apache.org/dist/tika/3.1.0/tika-server-standard-3.1.0.jar -O /tika-server.jar

EXPOSE 9998

CMD ["java", "-jar", "/tika-server.jar", "--port=9998", "--host=0.0.0.0"]
```

Run with Docker:
```bash
docker build -t tika-server .
docker run -d -p 9998:9998 --name tika tika-server
```

## 🔐 Security Considerations

### Production Security

1. **Bind to localhost only**: `--host=localhost` (default)
2. **Use firewall rules** to restrict access
3. **Run as non-root user**
4. **Monitor resource usage**

### Resource Limits

```bash
# Memory limit example
java -Xmx2g -XX:MaxMetaspaceSize=256m -jar tika-server.jar --port=9998

# File size limits (handled by pipeline)
# Max file size: 10MB (configurable in pipeline)
```

## 📊 Monitoring & Logs

### Health Check Endpoint

```bash
# Simple health check
curl http://localhost:9998/tika/version

# Expected response: version string (e.g., "3.1.0")
```

### Log Monitoring

```bash
# Monitor Tika server logs
tail -f tika.log

# Monitor AgriTool extraction logs
tail -f agritool-extraction.log
```

## 🆘 Emergency Recovery

### If Server Becomes Unresponsive

```bash
# Force restart
python tika_server_manager.py restart

# Or manually
pkill -f tika-server
python tika_server_manager.py start
```

### Reset Pipeline State

```bash
# Clear any stuck processes
pkill -f "pdf_extraction_pipeline"

# Restart agents
python enhanced_agent.py --single-batch
```

---

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] Tika server starts without errors
- [ ] Health check returns version string
- [ ] PDF extraction succeeds for test file
- [ ] Retry logic works during temporary failures
- [ ] Server manager can start/stop/restart server
- [ ] Production monitoring is configured

**Next Steps:** Run the AgriTool extraction pipeline with the fixed configuration!