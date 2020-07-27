import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DirectComponent } from './direct.component';
import { AuthGuard } from '../../../../auth/shared/guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    canActivate: [AuthGuard],
    component: DirectComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DirectRoutingModule {}
