import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { AvatarModule } from 'ngx-avatar';

import { FilesRoutingModule } from './files-routing.module';

import { FilesComponent } from './files.component';

import { SharedModule } from '../../shared/shared.module';
import { DirectModule } from './direct/direct.module';
import { GroupModule } from '../messages/group/group.module';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    AvatarModule,
    FilesRoutingModule,
    DirectModule,
    GroupModule,
    SharedModule
  ],
  entryComponents: [],
  schemas: [ CUSTOM_ELEMENTS_SCHEMA ],
  declarations: [FilesComponent]
})
export class FilesModule {}
