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

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { AuthModule } from '../auth/auth.module';
import { SharedModule } from './shared/shared.module';
import { Store } from 'src/store';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { UploadTaskComponent } from './teams/files/upload-task/upload-task.component';
import { PendingChangesGuard } from './shared/guards/pending-changes.guard';

@NgModule({
  declarations: [AppComponent],
  entryComponents: [],
  imports: [
    BrowserModule,
    HammerModule,
    IonicModule.forRoot(),
    AuthModule,
    AppRoutingModule,
    SharedModule.forRoot(),
    AvatarModule,
    HttpClientModule,
    CalendarModule,
    ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production }),
    NgxMaskModule.forRoot()
  ],
  schemas: [ CUSTOM_ELEMENTS_SCHEMA ],
  providers: [
    Store,
    StatusBar,
    SplashScreen,
    DocumentScanner,
    Badge,
    PendingChangesGuard,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
