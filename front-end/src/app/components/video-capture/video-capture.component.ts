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
  videoElementRef!: ElementRef<HTMLVideoElement>;

  constructor(private webrtcService: WebrtcService) {}

  ngOnInit(): void {
    this.startWebRTC();
  }

  // Start WebRTC streaming
  async startWebRTC(): Promise<void> {
    try {
      await this.webrtcService.startWebRTC(this.videoElementRef.nativeElement);
    } catch (error) {
      console.error('Failed to start WebRTC:', error);
    }
  }

  ngOnDestroy(): void {
    this.webrtcService.stopWebRTC();
  }
}
