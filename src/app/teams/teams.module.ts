import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { AvatarModule } from 'ngx-avatar';

import { TeamsRoutingModule } from './teams-routing.module';
import { TeamsPage } from './teams.page';
import { DashboardModule } from './dashboard/dashboard.module';
import { CalendarModule } from './calendar/calendar.module';
import { MessagesModule } from './messages/messages.module';
import { FilesModule } from './files/files.module';
import { NotesModule } from './notes/notes.module';
import { TeamModule } from './team/team.module';
import { ChildModule } from './child/child.module';
import { ResourcesModule } from './resources/resources.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TeamsRoutingModule,
    DashboardModule,
    CalendarModule,
    MessagesModule,
    FilesModule,
    NotesModule,
    TeamModule,
    ChildModule,
    ResourcesModule,
    AvatarModule
  ],
  schemas: [ CUSTOM_ELEMENTS_SCHEMA],
  declarations: [TeamsPage]
})
export class TeamsModule {}
