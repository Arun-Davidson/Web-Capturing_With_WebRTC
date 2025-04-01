import { Injectable } from '@angular/core';
import { Observable, from, Subject, BehaviorSubject, of, ReplaySubject } from 'rxjs';
import { switchMap, map, tap, catchError, retry, delay } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class VideoCaptureService {
  private mediaStream: MediaStream | null = null;
  private videoTrack: MediaStreamTrack | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;
  private ws: WebSocket | null = null;
  private wsUrl = 'ws://localhost:8080';

  private isStreaming$ = new BehaviorSubject<boolean>(false);
  private frameSubject = new Subject<string>();
  private streamSubject = new ReplaySubject<MediaStream>(1);
  private errorSubject = new ReplaySubject<string>(1);


  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    // this.initializeStream();
  }


  initializeStream(): void {
    this.initWebSocket()
      .pipe(
        switchMap(() => this.startCapture()),
        catchError((error) => {
          this.handleError('Web RTC initialization failed: ' + error.message);
          return of(null);
        })
      )
      .subscribe();
  }


  private initWebSocket(): Observable<boolean> {
    return new Observable<boolean>((subscriber) => {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        subscriber.next(true);
        subscriber.complete();
      };

      this.ws.onerror = (error) => {
        this.handleError('WebSocket connection error');
        subscriber.error(error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
      };
    }).pipe(
      retry({
        count: 3,
        delay: 2000,
      }),
      catchError((error) => {
        this.handleError(
          'Failed to connect to WebSocket after multiple attempts'
        );
        return of(false);
      })
    );
  }

  private startCapture(width = 640, height = 480): Observable<MediaStream> {
    return from(
      navigator.mediaDevices.getUserMedia({
        video: { width, height },
        audio: false,
      })
    ).pipe(
      retry({
        count: 2,
        delay: 1000,
      }),
      tap((stream) => {
        this.mediaStream = stream;
        this.videoTrack = stream.getVideoTracks()[0];
        this.canvas.width = width;
        this.canvas.height = height;
        this.isStreaming$.next(true);
        this.processFrames();
      }),
      catchError((error) => {
        this.handleError('Camera access error: ' + error.message);
        throw error;
      })
    );
  }

  private handleError(message: string): void {
    console.error(message);
    this.errorSubject.next(message);
    this.isStreaming$.next(false);
  }

  private processFrames() {
    const video = document.createElement('video');
    video.srcObject = this.mediaStream!;
    video.onerror = () => this.handleError('Video playback error');
    video.play().catch((err) => this.handleError('Video play failed: ' + err));

    const process = () => {
      if (!this.isStreaming$.value) return;

      if (this.ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
        try {
          this.ctx.drawImage(
            video,
            0,
            0,
            this.canvas.width,
            this.canvas.height
          );
          const imageData = this.ctx.getImageData(
            0,
            0,
            this.canvas.width,
            this.canvas.height
          );
          const hexData = this.imageDataToHex(imageData);
          this.frameSubject.next(hexData);

          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(
              JSON.stringify({
                type: 'video-frame',
                data: hexData,
              })
            );
          }
        } catch (err) {
          this.handleError('Frame processing error: ' + err);
        }
      }
      requestAnimationFrame(process);
    };

    process();
  }

  private imageDataToHex(imageData: ImageData): string {
    const buffer = new Uint8Array(imageData.data.buffer);
    return Array.from(buffer)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  getFrames(): Observable<string> {
    return this.frameSubject.asObservable();
  }

  getErrors(): Observable<string> {
    return this.errorSubject.asObservable();
  }

  isStreaming(): Observable<boolean> {
    return this.isStreaming$.asObservable();
  }

  getStream(): Observable<MediaStream> {
    return this.streamSubject.asObservable();
  }
}
