import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ProfileComponent } from './profile.component';
import { AuthGuard } from '../../../auth/shared/guards/auth.guard';
import { PendingChangesGuard } from 'src/app/shared/guards/pending-changes.guard';

const routes: Routes = [
  {
    path: '',
    canActivate: [AuthGuard],
    canDeactivate: [PendingChangesGuard],
    component: ProfileComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ProfileRoutingModule {}
