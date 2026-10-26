import { ChangeDetectionStrategy, Component } from '@angular/core';

import { AppComponent } from '../../app.component';

@Component({
  selector: 'app-setup-page',
  imports: [AppComponent],
  template: '<app-siri-sx-browser />',
  styles: ':host { display: block; min-height: 100vh; }',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SetupPageComponent {}
