import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TeamComponent } from './team.component';
import { AuthGuard } from '../../../auth/shared/guards/auth.guard';
import { PendingChangesGuard } from 'src/app/shared/guards/pending-changes.guard';

const routes: Routes = [
  {
    path: '',
    canActivate: [AuthGuard],
    component: TeamComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TeamRoutingModule {}
