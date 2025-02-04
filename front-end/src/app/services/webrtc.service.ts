import { Injectable } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WebrtcService {
  private peerConnection: RTCPeerConnection | null = null;
  private ws$: WebSocketSubject<any>;
  private signaling$ = new Subject<any>();

  constructor() {
    // Connect to the WebSocket server
    this.ws$ = webSocket('ws://localhost:3000');

    // Listen for signaling messages from the server
    this.ws$.subscribe((message) => {
      this.signaling$.next(message);
    });
  }

  // Initialize WebRTC connection
  async startWebRTC(videoElement: HTMLVideoElement): Promise<void> {
    // Create a new RTCPeerConnection
    this.peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }], // Use Google's public STUN server
    });

    console.log(this.peerConnection, 'this.peerConnection')

    // Add video stream to the connection
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoElement.srcObject = stream;

    stream.getTracks().forEach((track) => {
      this.peerConnection!.addTrack(track, stream);
    });

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.ws$.next({ type: 'candidate', candidate: event.candidate });
      }
    };

    // Handle remote stream (not needed for backend streaming)
    this.peerConnection.ontrack = (event) => {
      console.log('Received remote stream:', event.streams[0]);
    };

    // Create an offer and send it to the server
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    this.ws$.next({ type: 'offer', offer });

    // Listen for signaling messages
    this.signaling$.subscribe(async (message) => {
      if (message.type === 'answer') {
        await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(message.answer));
      } else if (message.type === 'candidate') {
        await this.peerConnection!.addIceCandidate(new RTCIceCandidate(message.candidate));
      }
    });
  }

  // Stop WebRTC connection
  stopWebRTC(): void {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }
}