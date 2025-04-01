const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

class HexVideoServer {
  constructor(port) {
    this.port = port || 8080;
    this.sessions = new Map();
    this.server = new WebSocket.Server({ port: this.port });
    this.setupEvents();
    console.log(`Server running on ws://localhost:${this.port}`);
  }

  setupEvents() {
    this.server.on('connection', (ws) => {
      const sessionId = uuidv4();
      this.sessions.set(sessionId, { ws, frames: [] });

      ws.on('message', (message) => {
        try {
          const { type, data } = JSON.parse(message);
          if (type === 'video-frame') {
            this.handleFrame(sessionId, data);
          }
        } catch (err) {
          console.error('Error processing message:', err);
        }
      });

      ws.on('close', () => {
        this.saveSessionData(sessionId);
        this.sessions.delete(sessionId);
      });
    });
  }

  handleFrame(sessionId, hexData) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.frames.push({
        timestamp: Date.now(),
        data: hexData
      });
      // Optional: Implement frame processing or analysis here
    }
  }

  saveSessionData(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session && session.frames.length > 0) {
      const filename = `session_${sessionId}_${Date.now()}.json`;
      const data = {
        sessionId,
        frames: session.frames
      };
      
      fs.writeFile(path.join(__dirname, 'sessions', filename), JSON.stringify(data), (err) => {
        if (err) console.error('Error saving session:', err);
        else console.log(`Session ${sessionId} saved`);
      });
    }
  }
}

// Ensure sessions directory exists
if (!fs.existsSync('sessions')) {
  fs.mkdirSync('sessions');
}

new HexVideoServer(8080);