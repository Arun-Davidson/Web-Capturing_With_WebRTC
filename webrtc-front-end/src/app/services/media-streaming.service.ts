import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

interface SignalingMessage {
  type: 'offer' | 'answer' | 'candidate';
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

@Injectable({
  providedIn: 'root',
})
export class MediaStreamingService {
  private static readonly CONFIG = {
    WEBSOCKET_URL: 'ws://localhost:3000',
    ICE_SERVERS: [{ urls: 'stun:stun.l.google.com:19302' }],
  };

  private peerConnection: RTCPeerConnection | null = null;
  private readonly destroy$ = new Subject<void>();
  private mediaStream: MediaStream | null = null;

  constructor() {}

  /**
   * Initializes WebRTC connection and starts video streaming
   * @param videoElement - The HTML video element to display the stream
   * @throws {Error} If media devices are not available or connection fails
   */
  async startMediaStreaming(videoElement: HTMLVideoElement): Promise<void> {
    try {
      await this.setupMediaStream(videoElement);
    } catch (error) {
      this.handleError('Failed to start WebRTC', error);
      throw error;
    }
  }

  /**
   * Sets up the media stream and adds tracks to peer connection
   */
  private async setupMediaStream(
    videoElement: HTMLVideoElement
  ): Promise<void> {
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      video: true,
    });
    videoElement.srcObject = this.mediaStream;

    this.mediaStream.getTracks().forEach((track) => {
      if (this.peerConnection && this.mediaStream) {
        this.peerConnection.addTrack(track, this.mediaStream);
      }
    });
  }

  /**
   * Handles and logs errors
   */
  private handleError(context: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`${context}:`, errorMessage);
  }

  /**
   * Stops media connection and cleans up resources
   */
  stopMediaStreaning(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    this.destroy$.next();
    this.destroy$.complete();
  }
}
