import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VideoCaptureComponent } from './video-capture.component';

describe('VideoCaptureComponent', () => {
  let component: VideoCaptureComponent;
  let fixture: ComponentFixture<VideoCaptureComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VideoCaptureComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VideoCaptureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
