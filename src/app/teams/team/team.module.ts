import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AvatarModule } from 'ngx-avatar';

import { TeamRoutingModule } from './team-routing.module';

import { TeamComponent } from './team.component';
import { EditTeamComponent } from './edit-team/edit-team.component';
import { EditChildComponent } from './edit-child/edit-child.component';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AvatarModule,
    TeamRoutingModule,
    SharedModule
  ],
  entryComponents: [ EditTeamComponent, EditChildComponent ],
  schemas: [ CUSTOM_ELEMENTS_SCHEMA ],
  declarations: [TeamComponent, EditTeamComponent, EditChildComponent]
})
export class TeamModule {}
