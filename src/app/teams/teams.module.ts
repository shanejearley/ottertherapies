import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { AvatarModule } from 'ngx-avatar';

import { TeamsRoutingModule } from './teams-routing.module';
import { TeamsPage } from './teams.page';
import { DashboardModule } from './dashboard/dashboard.module';
import { EventsModule } from './events/events.module';
import { MessagesModule } from './messages/messages.module';
import { FilesModule } from './files/files.module';
import { NotesModule } from './notes/notes.module';
import { TeamModule } from './team/team.module';
import { ChildModule } from './child/child.module';
import { ResourcesModule } from './resources/resources.module';
import { ProfileModule } from './profile/profile.module';
import { CreateTeamComponent } from './create-team/create-team.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TeamsRoutingModule,
    DashboardModule,
    EventsModule,
    MessagesModule,
    FilesModule,
    NotesModule,
    TeamModule,
    ChildModule,
    ResourcesModule,
    ProfileModule,
    AvatarModule
  ],
  entryComponents: [CreateTeamComponent],
  schemas: [ CUSTOM_ELEMENTS_SCHEMA],
  declarations: [TeamsPage, CreateTeamComponent]
})
export class TeamsModule {}
