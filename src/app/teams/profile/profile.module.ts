import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { AvatarModule } from 'ngx-avatar';
import { ImageCropperModule } from 'ngx-image-cropper';

import { ProfileRoutingModule } from './profile-routing.module';

import { ProfileComponent } from './profile.component';
import { ProfilePictureComponent } from 'src/app/teams/profile/profile-picture/profile-picture.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AvatarModule,
    ImageCropperModule,
    ProfileRoutingModule
  ],
  entryComponents: [ProfilePictureComponent],
  schemas: [ CUSTOM_ELEMENTS_SCHEMA ],
  declarations: [ProfileComponent, ProfilePictureComponent]
})
export class ProfileModule {}
