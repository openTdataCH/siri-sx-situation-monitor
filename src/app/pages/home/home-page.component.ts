import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  template: `
    <main class="container py-5">
      <section class="rounded-3 border bg-light p-5 shadow-sm">
        <h1 class="display-6 fw-semibold">SIRI-SX Situation Monitor</h1>
        <p class="lead">The default page is ready for the next application view.</p>
        <a class="btn btn-primary" routerLink="/setup">Open setup</a>
      </section>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomePageComponent {}
