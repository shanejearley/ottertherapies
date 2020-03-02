import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { IonicModule } from '@ionic/angular';

// third-party modules
import { AngularFireModule, FirebaseAppConfig } from '@angular/fire';
import { AngularFireAuthModule } from '@angular/fire/auth';
import { AngularFireStorageModule } from '@angular/fire/storage';
import 'firebase/storage';
// shared modules
import { SharedModule } from './shared/shared.module';

export const ROUTES: Routes = [
  {
    path: 'auth',
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'login' },
      { path: 'login', loadChildren: './login/login.module#LoginModule' },
      { path: 'register', loadChildren: './register/register.module#RegisterModule' },
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
    RouterModule.forChild(ROUTES),
    IonicModule,
    AngularFireModule.initializeApp(firebaseConfig),
    AngularFireAuthModule,
    AngularFireStorageModule,
    SharedModule.forRoot()
  ],
  exports: [RouterModule]
})
export class AuthModule {}