import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'Teams',
    loadChildren: () => import('./teams/teams.module').then(m => m.TeamsModule)
  },
  {
    path: 'Teams/:id',
    redirectTo: 'Teams/:id/Team',
    pathMatch: 'full'
  },
  {
    path: 'Teams/:id/Events',
    loadChildren: () => import('./teams/events/events.module').then(m => m.EventsModule)
  },
  {
    path: 'Teams/:id/Messages',
    loadChildren: () => import('./teams/messages/messages.module').then(m => m.MessagesModule)
  },
  {
    path: 'Teams/:id/Files',
    loadChildren: () => import('./teams/files/files.module').then(m => m.FilesModule)
  },
  {
    path: 'Teams/:id/Notes',
    loadChildren: () => import('./teams/notes/notes.module').then(m => m.NotesModule)
  },
  {
    path: 'Teams/:id/Team',
    loadChildren: () => import('./teams/team/team.module').then(m => m.TeamModule)
  },
  {
    path: 'Profile',
    loadChildren: () => import('./teams/profile/profile.module').then(m => m.ProfileModule)
  },
  {
    path: 'Teams/:id/Messages/Group/:groupId',
    loadChildren: () => import('./teams/messages/group/group.module').then(m => m.GroupModule)
  },
  {
    path: 'Teams/:id/Messages/Direct/:directId',
    loadChildren: () => import('./teams/messages/direct/direct.module').then(m => m.DirectModule)
  },
  {
    path: 'Teams/:id/Files/Group/:groupId',
    loadChildren: () => import('./teams/files/group/group.module').then(m => m.GroupModule)
  },
  {
    path: 'Teams/:id/Files/Direct/:directId',
    loadChildren: () => import('./teams/files/direct/direct.module').then(m => m.DirectModule)
  },
  {
    path: 'Teams/:id/Team/Member/:directId',
    loadChildren: () => import('./teams/team/member/member.module').then(m => m.MemberModule)
  },
  {
    path: '',
    redirectTo: 'Teams',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: ''
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
