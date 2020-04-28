import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { SharedModule } from '../shared/shared.module';

import { LoginComponent } from './containers/login/login.component';
import { MfaVerifyComponent } from './containers/login/mfa-verify/mfa-verify.component';
import { NgxMaskModule } from 'ngx-mask';

export const ROUTES: Routes = [
  { path: '', component: LoginComponent }
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
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  entryComponents: [MfaVerifyComponent],
  declarations: [
    LoginComponent,
    MfaVerifyComponent
  ]
})
export class LoginModule {}