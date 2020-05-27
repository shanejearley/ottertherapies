import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { IonicModule } from '@ionic/angular';

// third-party modules
import { AngularFireModule, FirebaseAppConfig } from '@angular/fire';
import { AngularFireAuthModule } from '@angular/fire/auth';
import { AngularFirestoreModule } from '@angular/fire/firestore';
import { AngularFireStorageModule } from '@angular/fire/storage';
import { AngularFireFunctionsModule, FUNCTIONS_ORIGIN } from '@angular/fire/functions';
import { AngularFireMessagingModule } from '@angular/fire/messaging';
import 'firebase/storage';
// shared modules
import { SharedModule } from './shared/shared.module';
import { environment } from 'src/environments/environment';
import { AngularFireDatabaseModule } from '@angular/fire/database';

export const ROUTES: Routes = [
  {
    path: 'auth',
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'login' },
      { path: 'login', loadChildren: () => import('./login/login.module').then(m => m.LoginModule) },
      { path: 'register', loadChildren: () => import('./register/register.module').then(m => m.RegisterModule) },
      { path: 'verify', loadChildren: () => import('./verify/verify.module').then(m => m.VerifyModule) },
      { path: 'two-factor', loadChildren: () => import('./two-factor/two-factor.module').then(m => m.TwoFactorModule) },
      { path: 'manage', loadChildren: () => import('./manage/manage.module').then(m => m.ManageModule) },
      { path: 'reset', loadChildren: () => import('./reset/reset.module').then(m => m.ResetModule) }
    ]
  }
];

export const firebaseConfig: FirebaseAppConfig = environment.firebaseConfig;

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild(ROUTES),
    IonicModule,
    AngularFireModule.initializeApp(firebaseConfig),
    AngularFireAuthModule,
    AngularFirestoreModule,
    AngularFireStorageModule,
    AngularFireFunctionsModule,
    AngularFireMessagingModule,
    AngularFireDatabaseModule,
    SharedModule.forRoot()
  ],
  providers: [
    { provide: FUNCTIONS_ORIGIN, useValue: 'https://ottertherapies.web.app' }
  ],
  schemas: [ CUSTOM_ELEMENTS_SCHEMA ],
  exports: [RouterModule]
})
export class AuthModule {}