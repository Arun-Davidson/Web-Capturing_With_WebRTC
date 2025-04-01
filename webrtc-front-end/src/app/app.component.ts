import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VideoCaptureService } from './services/video-capture.service';
import { combineLatest, Observable, of, Subject, Subscription } from 'rxjs';
import { map, startWith, switchMap, take, takeUntil } from 'rxjs/operators';
import { VideoCaptureComponent } from './components/video-capture/video-capture.component';


interface StatusMessage {
  text: string;
  type: 'error' | 'info' | 'success';
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, VideoCaptureComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})

export class AppComponent implements OnInit {
  
  hexData$: Observable<string>;
  statusMessage$: Observable<StatusMessage>;
  showVideo$: Observable<boolean>;
  showHexData$: Observable<boolean>;

  private destroy$ = new Subject<void>();
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;

  errorMessage = '';

  constructor(private videoService: VideoCaptureService) {
   
    
    // Initialize observables with proper typing
    this.hexData$ = this.videoService.getFrames().pipe(
      startWith<string>('')
    );

    const error$ = this.videoService.getErrors().pipe(
      map<string, StatusMessage>(error => ({ 
        text: error, 
        type: 'error' 
      }))
    );

    const initialMessage$ = of<StatusMessage>({ 
      text: 'Initializing video stream...', 
      type: 'info' 
    });

    this.statusMessage$ = combineLatest([error$, initialMessage$]).pipe(
      map<[StatusMessage, StatusMessage], StatusMessage>(([error, initial]) => 
        error.text ? error : initial
      )
    );

    this.showVideo$ = this.videoService.isStreaming();
    this.showHexData$ = this.videoService.isStreaming();
  }

  ngOnInit() {

    this.videoService.isStreaming().pipe(
      take(1)
    ).subscribe((isStreaming: boolean) => {
      console.log(isStreaming, 'isStreaming')
      if (!isStreaming) {
        // Error handling is managed by the service
      }
    });
  }

  async setupCamera() {
    try {
      await this.videoService.initializeStream();
      this.videoService.getStream().pipe(
        takeUntil(this.destroy$)
      ).subscribe(stream => {
        const video = this.videoElement.nativeElement;
        video.srcObject = stream;
        video.onloadedmetadata = () => video.play();
      });
    } catch (err) {
      this.errorMessage = 'Camera error: ' + (err as Error).message;
    }
  }

  async ngAfterViewInit() {
    await this.setupCamera();
    this.videoService.getStream().pipe(
      takeUntil(this.destroy$)
    ).subscribe((stream: any) => {
      if (stream && this.videoElement?.nativeElement) {
        this.videoElement.nativeElement.srcObject = stream;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}