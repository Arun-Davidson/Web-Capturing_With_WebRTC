import { Component } from '@angular/core';
import { VideoCaptureComponent } from "./components/video-capture/video-capture.component";

@Component({
  selector: 'app-root',
  imports: [VideoCaptureComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'front-end';
}
