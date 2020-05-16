import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { AvatarModule } from 'ngx-avatar';
import { ImageCropperModule } from 'ngx-image-cropper';

import { ProfileRoutingModule } from './profile-routing.module';

import { ProfileComponent } from './profile.component';
import { ProfilePictureComponent } from 'src/app/teams/profile/profile-picture/profile-picture.component';
import { DeleteUserComponent } from './delete-user/delete-user.component';

import { SharedModule } from '../../shared/shared.module';
import { EditProfileComponent } from './edit-profile/edit-profile.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AvatarModule,
    ImageCropperModule,
    ProfileRoutingModule,
    SharedModule
  ],
  entryComponents: [ProfilePictureComponent, DeleteUserComponent, EditProfileComponent],
  schemas: [ CUSTOM_ELEMENTS_SCHEMA ],
  declarations: [ProfileComponent, ProfilePictureComponent, DeleteUserComponent, EditProfileComponent]
})
export class ProfileModule {}
