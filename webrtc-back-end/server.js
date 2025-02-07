const express = require('express');
const WebSocket = require('ws');
const path = require('path');

class WebRTCSignalingServer {
    static CONFIG = {
        PORT: 3000,
        STATIC_PATH: 'public'
    };

    constructor() {
        this.app = express();
        this.setupExpress();
        this.server = this.createServer();
        this.wss = this.createWebSocketServer();
        this.setupWebSocketHandlers();
    }

    /**
     * Configure Express application
     */
    setupExpress() {
        this.app.use(express.static(path.join(__dirname, WebRTCSignalingServer.CONFIG.STATIC_PATH)));
    }

    /**
     * Create and configure HTTP server
     * @returns {http.Server} Configured HTTP server
     */
    createServer() {
        return this.app.listen(WebRTCSignalingServer.CONFIG.PORT, () => {
            console.log(`Server running on http://localhost:${WebRTCSignalingServer.CONFIG.PORT}`);
        });
    }

    /**
     * Create WebSocket server instance
     * @returns {WebSocket.Server} Configured WebSocket server
     */
    createWebSocketServer() {
        return new WebSocket.Server({ server: this.server });
    }

    /**
     * Setup WebSocket event handlers
     */
    setupWebSocketHandlers() {
        this.wss.on('connection', this.handleConnection.bind(this));
    }

    /**
     * Handle new WebSocket connection
     * @param {WebSocket} ws - WebSocket connection instance
     */
    handleConnection(ws) {
        console.log('Client connected');

        ws.on('message', (message) => this.handleMessage(ws, message));
        ws.on('close', () => this.handleDisconnection(ws));
        ws.on('error', this.handleError);
    }

    /**
     * Handle incoming WebSocket messages
     * @param {WebSocket} ws - WebSocket connection instance
     * @param {Buffer} message - Raw message data
     */
    handleMessage(ws, message) {
        try {
            const data = JSON.parse(message.toString());
            this.routeMessage(ws, data);
        } catch (error) {
            this.handleError('Message parsing error:', error);
        }
    }

    /**
     * Route message to appropriate handler based on type
     * @param {WebSocket} ws - WebSocket connection instance
     * @param {Object} data - Parsed message data
     */
    routeMessage(ws, data) {
        const handlers = {
            'offer': () => this.broadcastSignal(ws, 'offer', data.offer),
            'answer': () => this.broadcastSignal(ws, 'answer', data.answer),
            'candidate': () => this.broadcastSignal(ws, 'candidate', data.candidate)
        };

        const handler = handlers[data.type];
        if (handler) {
            handler();
        } else {
            console.warn('Unknown message type:', data.type);
        }
    }

    /**
     * Broadcast WebRTC signal to other clients
     * @param {WebSocket} sender - Sending client's WebSocket
     * @param {string} type - Signal type
     * @param {Object} payload - Signal payload
     */
    broadcastSignal(sender, type, payload) {
        console.log(`Broadcasting ${type}:`, payload);
        
        this.wss.clients.forEach((client) => {
            if (this.shouldSendToClient(client, sender)) {
                this.sendSignal(client, type, payload);
            }
        });
    }

    /**
     * Determine if signal should be sent to client
     * @param {WebSocket} client - Target client
     * @param {WebSocket} sender - Sending client
     * @returns {boolean} Whether to send to client
     */
    shouldSendToClient(client, sender) {
        return client !== sender && client.readyState === WebSocket.OPEN;
    }

    /**
     * Send signal to specific client
     * @param {WebSocket} client - Target client
     * @param {string} type - Signal type
     * @param {Object} payload - Signal payload
     */
    sendSignal(client, type, payload) {
        client.send(JSON.stringify({ type, [type]: payload }));
    }

    /**
     * Handle client disconnection
     * @param {WebSocket} ws - Disconnected client's WebSocket
     */
    handleDisconnection(ws) {
        console.log('Client disconnected');
        // Additional cleanup could be added here
    }

    /**
     * Handle WebSocket errors
     * @param {Error} error - Error object
     */
    handleError(error) {
        console.error('WebSocket error:', error);
    }
}

// Create and initialize server
new WebRTCSignalingServer();