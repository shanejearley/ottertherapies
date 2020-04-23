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
import 'firebase/storage';
// shared modules
import { SharedModule } from './shared/shared.module';

export const ROUTES: Routes = [
  {
    path: 'auth',
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'login' },
      { path: 'login', loadChildren: () => import('./login/login.module').then(m => m.LoginModule) },
      { path: 'register', loadChildren: () => import('./register/register.module').then(m => m.RegisterModule) },
      { path: 'verify', loadChildren: () => import('./verify/verify.module').then(m => m.VerifyModule) },
      { path: 'two-factor', loadChildren: () => import('./two-factor/two-factor.module').then(m => m.TwoFactorModule) }
    ]
  }
];

export const firebaseConfig: FirebaseAppConfig = {
  apiKey: "AIzaSyDf-uqPDM4tCCS707r-eeGlif49JmKbfYY",
  authDomain: "ottertherapies.firebaseapp.com",
  databaseURL: "https://ottertherapies.firebaseio.com",
  projectId: "ottertherapies",
  storageBucket: "ottertherapies.appspot.com",
  messagingSenderId: "842164942057",
  appId: "1:842164942057:web:959f9a4ba101fdd6d3ec78"
};

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
    SharedModule.forRoot()
  ],
  providers: [
    { provide: FUNCTIONS_ORIGIN, useValue: 'https://ottertherapies.web.app' }
  ],
  schemas: [ CUSTOM_ELEMENTS_SCHEMA ],
  exports: [RouterModule]
})
export class AuthModule {}