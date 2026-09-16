import { ChangeDetectionStrategy, Component } from '@angular/core';

import { AppComponent } from '../../app.component';

@Component({
  selector: 'app-timeline-page',
  imports: [AppComponent],
  template: '<app-siri-sx-browser viewMode="timeline" />',
  styles: ':host { display: block; min-height: 100vh; }',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimelinePageComponent {}
