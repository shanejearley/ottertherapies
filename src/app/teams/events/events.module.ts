import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';
import { CalendarModule } from "ion2-calendar";

import { EventsRoutingModule } from './events-routing.module';

import { EventsComponent } from './events.component';
import { CreateEventComponent } from './create-event/create-event.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    EventsRoutingModule,
    CalendarModule
  ],
  entryComponents: [CreateEventComponent],
  schemas: [ CUSTOM_ELEMENTS_SCHEMA ],
  declarations: [EventsComponent, CreateEventComponent]
})
export class EventsModule {}
