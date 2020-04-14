import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { SharedModule } from '../shared/shared.module';

import { TwoFactorComponent } from './two-factor.component';

export const ROUTES: Routes = [
  { path: '', component: TwoFactorComponent }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(ROUTES),
    IonicModule,
    SharedModule
  ],
  declarations: [
    TwoFactorComponent
  ]
})
export class TwoFactorModule {}