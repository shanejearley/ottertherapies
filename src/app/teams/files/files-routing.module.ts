import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { FilesComponent } from './files.component';
import { AuthGuard } from '../../../auth/shared/guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    canActivate: [AuthGuard],
    component: FilesComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FilesRoutingModule {}
