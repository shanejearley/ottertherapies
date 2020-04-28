import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { IonicModule } from '@ionic/angular';

import { NgxMaskModule } from 'ngx-mask';

import { SharedModule } from '../shared/shared.module';

import { TwoFactorComponent } from './two-factor.component';
import { MfaAddComponent } from './mfa-add/mfa-add.component';

export const ROUTES: Routes = [
  { path: '', component: TwoFactorComponent }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(ROUTES),
    IonicModule,
    SharedModule,
    NgxMaskModule.forChild()
  ],
  entryComponents: [MfaAddComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  declarations: [
    TwoFactorComponent,
    MfaAddComponent
  ]
})
export class TwoFactorModule {}