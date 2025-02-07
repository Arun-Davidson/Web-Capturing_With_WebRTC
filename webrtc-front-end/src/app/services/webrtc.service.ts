import { Injectable } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Subject, takeUntil } from 'rxjs';

interface SignalingMessage {
  type: 'offer' | 'answer' | 'candidate';
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

@Injectable({
  providedIn: 'root',
})
export class WebrtcService {
  private static readonly CONFIG = {
    WEBSOCKET_URL: 'ws://localhost:3000',
    ICE_SERVERS: [{ urls: 'stun:stun.l.google.com:19302' }],
  };

  private peerConnection: RTCPeerConnection | null = null;
  private readonly ws$: WebSocketSubject<SignalingMessage>;
  private readonly signaling$ = new Subject<SignalingMessage>();
  private readonly destroy$ = new Subject<void>();
  private mediaStream: MediaStream | null = null;

  constructor() {
    this.ws$ = webSocket<SignalingMessage>(WebrtcService.CONFIG.WEBSOCKET_URL);
    this.initializeWebSocketConnection();
  }

  /**
   * Initializes WebSocket connection and sets up message handling
   */
  private initializeWebSocketConnection(): void {
    this.ws$.pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (message) => this.signaling$.next(message),
      error: (error) => console.error('WebSocket error:', error),
      complete: () => console.log('WebSocket connection closed')
    });
  }

  /**
   * Initializes WebRTC connection and starts video streaming
   * @param videoElement - The HTML video element to display the stream
   * @throws {Error} If media devices are not available or connection fails
   */
  async startWebRTC(videoElement: HTMLVideoElement): Promise<void> {
    try {
      await this.initializePeerConnection();
      await this.setupMediaStream(videoElement);
      await this.createAndSendOffer();
      this.setupSignalingHandlers();
    } catch (error) {
      this.handleError('Failed to start WebRTC', error);
      throw error;
    }
  }

  /**
   * Initializes the RTCPeerConnection with configured ICE servers
   */
  private async initializePeerConnection(): Promise<void> {
    this.peerConnection = new RTCPeerConnection({
      iceServers: WebrtcService.CONFIG.ICE_SERVERS,
    });

    this.peerConnection.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.ws$.next({ type: 'candidate', candidate });
      }
    };

    this.peerConnection.ontrack = (event) => {
      console.log('Received remote stream:', event.streams[0]);
    };
  }

  /**
   * Sets up the media stream and adds tracks to peer connection
   */
  private async setupMediaStream(videoElement: HTMLVideoElement): Promise<void> {
    this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
      video: true 
    });
    videoElement.srcObject = this.mediaStream;

    this.mediaStream.getTracks().forEach((track) => {
      if (this.peerConnection && this.mediaStream) {
        this.peerConnection.addTrack(track, this.mediaStream);
      }
    });
  }

  /**
   * Creates and sends the WebRTC offer
   */
  private async createAndSendOffer(): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('PeerConnection not initialized');
    }

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    this.ws$.next({ type: 'offer', offer });
  }

  /**
   * Sets up handlers for signaling messages
   */
  private setupSignalingHandlers(): void {
    this.signaling$.pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: async (message) => {
        try {
          await this.handleSignalingMessage(message);
        } catch (error) {
          this.handleError('Signaling error', error);
        }
      },
      error: (error) => this.handleError('Signaling subscription error', error)
    });
  }

  /**
   * Handles incoming signaling messages
   */
  private async handleSignalingMessage(message: SignalingMessage): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('PeerConnection not initialized');
    }

    switch (message.type) {
      case 'answer':
        if (message.answer) {
          await this.peerConnection.setRemoteDescription(
            new RTCSessionDescription(message.answer)
          );
        }
        break;
      case 'candidate':
        if (message.candidate) {
          await this.peerConnection.addIceCandidate(
            new RTCIceCandidate(message.candidate)
          );
        }
        break;
    }
  }

  /**
   * Handles and logs errors
   */
  private handleError(context: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`${context}:`, errorMessage);
  }

  /**
   * Stops WebRTC connection and cleans up resources
   */
  stopWebRTC(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.destroy$.next();
    this.destroy$.complete();
  }
}