import { Component } from '@angular/core';

@Component({
  selector: 'app-public-layout',
  template: '<main class="public-layout"><router-outlet></router-outlet></main>',
  styles: [
    '.public-layout { min-height: 100vh; width: 100%; }'
  ]
})
export class PublicLayoutComponent {}
