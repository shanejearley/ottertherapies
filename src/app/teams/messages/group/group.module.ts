import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AvatarModule } from 'ngx-avatar';

import { GroupRoutingModule } from './group-routing.module';
import { GroupComponent } from './group.component';
import { EditGroupComponent } from '../../../shared/components/edit-group/edit-group.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AvatarModule,
    GroupRoutingModule
  ],
  entryComponents: [EditGroupComponent],
  schemas: [ CUSTOM_ELEMENTS_SCHEMA ],
  declarations: [GroupComponent, EditGroupComponent]
})
export class GroupModule {}
