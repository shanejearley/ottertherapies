import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { AngularFirestoreModule } from '@angular/fire/firestore';

// services
import { AuthService } from '../../auth/shared/services/auth/auth.service';
import { ProfileService } from '../../auth/shared/services/profile/profile.service';
import { TeamsService } from './services/teams/teams.service';
import { GroupsService } from './services/groups/groups.service';
import { MembersService } from './services/members/members.service';
import { NotesService } from './services/notes/notes.service';
import { PendingService } from './services/pending/pending.service';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AngularFirestoreModule
  ]
})
export class SharedModule {
  static forRoot(): ModuleWithProviders {
    return {
      ngModule: SharedModule,
      providers: [
        AuthService,
        ProfileService,
        TeamsService,
        GroupsService,
        MembersService,
        NotesService,
        PendingService
      ]
    };
  }
}