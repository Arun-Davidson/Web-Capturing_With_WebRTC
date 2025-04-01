import { ApplicationConfig } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { VideoCaptureService } from './services/video-capture.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimations(),
    VideoCaptureService
  ]
};