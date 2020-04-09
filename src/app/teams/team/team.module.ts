import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AvatarModule } from 'ngx-avatar';

import { TeamRoutingModule } from './team-routing.module';

import { TeamComponent } from './team.component';
import { EditTeamComponent } from './edit-team/edit-team.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AvatarModule,
    TeamRoutingModule
  ],
  entryComponents: [ EditTeamComponent ],
  schemas: [ CUSTOM_ELEMENTS_SCHEMA ],
  declarations: [TeamComponent, EditTeamComponent]
})
export class TeamModule {}
