import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { AvatarModule } from 'ngx-avatar';
import { NgxFileDropModule } from 'ngx-file-drop';

import { FilesRoutingModule } from './files-routing.module';

import { FilesComponent } from './files.component';
import { ScanComponent } from './scan/scan.component';
import { BrowseComponent } from './browse/browse.component';

import { SharedModule } from '../../shared/shared.module';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    AvatarModule,
    FilesRoutingModule,
    NgxFileDropModule,
    SharedModule
  ],
  entryComponents: [ScanComponent, BrowseComponent],
  schemas: [ CUSTOM_ELEMENTS_SCHEMA ],
  declarations: [FilesComponent, ScanComponent, BrowseComponent]
})
export class FilesModule {}
