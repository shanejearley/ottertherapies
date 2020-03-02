import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { AvatarModule } from 'ngx-avatar';

import { FilesRoutingModule } from './files-routing.module';

import { FilesComponent } from './files.component';
import { ScanComponent } from './scan/scan.component'
import { UploadComponent } from './upload/upload.component'

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AvatarModule,
    FilesRoutingModule
  ],
  entryComponents: [ScanComponent, UploadComponent],
  schemas: [ CUSTOM_ELEMENTS_SCHEMA ],
  declarations: [FilesComponent, ScanComponent, UploadComponent]
})
export class FilesModule {}
