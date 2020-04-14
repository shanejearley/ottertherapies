import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { SharedModule } from '../shared/shared.module';

import { VerifyComponent } from './verify.component';

export const ROUTES: Routes = [
  { path: '', component: VerifyComponent }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(ROUTES),
    IonicModule,
    SharedModule
  ],
  declarations: [
    VerifyComponent
  ]
})
export class VerifyModule {}