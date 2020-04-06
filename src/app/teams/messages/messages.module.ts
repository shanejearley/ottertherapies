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

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AvatarModule,
    MessagesRoutingModule,
    GroupModule,
    DirectModule
  ],
  entryComponents: [CreateGroupComponent],
  schemas: [ CUSTOM_ELEMENTS_SCHEMA ],
  declarations: [MessagesComponent, CreateGroupComponent]
})
export class MessagesModule {}
