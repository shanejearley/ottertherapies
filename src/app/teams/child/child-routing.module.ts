import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ChildComponent } from './child.component';
import { AuthGuard } from '../../../auth/shared/guards/auth.guard';
import { PendingChangesGuard } from 'src/app/shared/guards/pending-changes.guard';

const routes: Routes = [
  {
    path: '',
    canActivate: [AuthGuard],
    canDeactivate: [PendingChangesGuard],
    component: ChildComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ChildRoutingModule {}
