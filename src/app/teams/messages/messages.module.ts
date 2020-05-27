import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { AvatarModule } from 'ngx-avatar';

import { MessagesRoutingModule } from './messages-routing.module';

import { MessagesComponent } from './messages.component';
import { GroupModule } from './group/group.module';
import { DirectModule } from './direct/direct.module';
import { CreateGroupComponent } from 'src/app/shared/components/create-group/create-group.component';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AvatarModule,
    MessagesRoutingModule,
    GroupModule,
    DirectModule,
    SharedModule
  ],
  entryComponents: [CreateGroupComponent],
  schemas: [ CUSTOM_ELEMENTS_SCHEMA ],
  declarations: [MessagesComponent, CreateGroupComponent]
})
export class MessagesModule {}
