import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { WebrtcService } from '../../services/webrtc.service';

@Component({
  selector: 'app-video-capture',
  templateUrl: './video-capture.component.html',
  styleUrls: ['./video-capture.component.scss'],
})
export class VideoCaptureComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement', { static: true })
  private readonly videoElementRef!: ElementRef<HTMLVideoElement>;

  private isStreamActive = false;

  constructor(private readonly webrtcService: WebrtcService) {}

  async ngOnInit(): Promise<void> {
    await this.initializeWebRTC();
  }

  /**
   * Initializes WebRTC streaming and handles connection setup
   * @throws {Error} If video element is not properly initialized
   */
  private async initializeWebRTC(): Promise<void> {
    if (!this.videoElementRef?.nativeElement) {
      throw new Error('Video element reference not initialized');
    }

    try {
      await this.webrtcService.startWebRTC(this.videoElementRef.nativeElement);
      this.isStreamActive = true;
    } catch (error) {
      this.handleWebRTCError(error);
    }
  }

  /**
   * Handles WebRTC-related errors
   * @param error - The error object thrown during WebRTC operations
   */
  private handleWebRTCError(error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('WebRTC initialization failed:', errorMessage);
    // Here you could add additional error handling logic
    // such as showing a user-friendly error message or retrying the connection
  }

  ngOnDestroy(): void {
    if (this.isStreamActive) {
      this.webrtcService.stopWebRTC();
      this.isStreamActive = false;
    }
  }
}
