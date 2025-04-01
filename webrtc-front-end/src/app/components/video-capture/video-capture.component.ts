import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { MediaStreamingService } from '../../services/media-streaming.service';

@Component({
  selector: 'app-video-capture',
  templateUrl: './video-capture.component.html',
  styleUrls: ['./video-capture.component.scss'],
})
export class VideoCaptureComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement', { static: true })
  private readonly videoElementRef!: ElementRef<HTMLVideoElement>;

  private isStreamActive = false;

  constructor(private readonly mediaStreamingService: MediaStreamingService) {}

  async ngOnInit(): Promise<void> {
    await this.initializeMediaStreaming();
  }

  /**
   * Initializes video streaming and handles connection setup
   * @throws {Error} If video element is not properly initialized
   */
  private async initializeMediaStreaming(): Promise<void> {
    if (!this.videoElementRef?.nativeElement) {
      throw new Error('Video element reference not initialized');
    }

    try {
      await this.mediaStreamingService.startMediaStreaming(this.videoElementRef.nativeElement);
      this.isStreamActive = true;
    } catch (error) {
      console.log(error, 'error')
    }
  }


  ngOnDestroy(): void {
    if (this.isStreamActive) {
      this.mediaStreamingService.stopMediaStreaning();
      this.isStreamActive = false;
    }
  }
}