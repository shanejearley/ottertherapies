import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { BrowserModule, HammerModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { DocumentScanner } from '@ionic-native/document-scanner/ngx';
import { Badge } from '@ionic-native/badge/ngx';

import { AvatarModule } from 'ngx-avatar';
import { CalendarModule } from 'ion2-calendar';
import { NgxMaskModule } from 'ngx-mask';
import { NgCircleProgressModule } from 'ng-circle-progress';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { AuthModule } from '../auth/auth.module';
import { SharedModule } from './shared/shared.module';
import { Store } from 'src/store';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { PendingChangesGuard } from './shared/guards/pending-changes.guard';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { InAppBrowser } from '@ionic-native/in-app-browser/ngx';

@NgModule({
  declarations: [AppComponent],
  entryComponents: [],
  imports: [
    BrowserModule,
    HammerModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule.forRoot(),
    AuthModule,
    AppRoutingModule,
    SharedModule.forRoot(),
    AvatarModule,
    HttpClientModule,
    CalendarModule,
    ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production }),
    NgxMaskModule.forRoot(),
    NgCircleProgressModule.forRoot()
  ],
  schemas: [ CUSTOM_ELEMENTS_SCHEMA ],
  providers: [
    Store,
    StatusBar,
    SplashScreen,
    DocumentScanner,
    InAppBrowser,
    Badge,
    PendingChangesGuard,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
