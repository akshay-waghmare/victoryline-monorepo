import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadChildren: './layouts/admin-layouts/admin-layouts.module#AdminLayoutsModule'
  },
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forRoot(routes, {
      // Restore the user to their previous place when they use Back. Direct
      // player routes also reset themselves after their async data renders.
      scrollPositionRestoration: 'enabled',
      anchorScrolling: 'enabled',
      scrollOffset: [0, 64], // Offset for fixed navbar (64px height)
      enableTracing: false, // Set to true for debugging router events
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
