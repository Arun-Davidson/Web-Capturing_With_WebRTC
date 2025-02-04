const express = require('express');
const WebSocket = require('ws');
const path = require('path');

// Create an Express app
const app = express();
const port = 3000;

// Serve static files (for testing purposes)
app.use(express.static(path.join(__dirname, 'public')));

// Create an HTTP server
const server = app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

// Create a WebSocket server
const wss = new WebSocket.Server({ server });

// Handle WebSocket connections
wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', (message) => {
        const data = JSON.parse(message.toString());

        switch (data.type) {
            case 'offer':
                console.log('Received offer:', data.offer);
                // Broadcast the offer to other clients
                wss.clients.forEach((client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'offer', offer: data.offer }));
                    }
                });
                break;

            case 'answer':
                console.log('Received answer:', data.answer);
                // Broadcast the answer to other clients
                wss.clients.forEach((client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'answer', answer: data.answer }));
                    }
                });
                break;

            case 'candidate':
                console.log('Received ICE candidate:', data.candidate);
                // Broadcast the ICE candidate to other clients
                wss.clients.forEach((client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'candidate', candidate: data.candidate }));
                    }
                });
                break;

            default:
                console.warn('Unknown message type:', data.type);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});