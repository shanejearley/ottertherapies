import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertController } from '@ionic/angular';

import { Plugins } from '@capacitor/core';
const { Browser } = Plugins;

import { Observable } from 'rxjs';
import { Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators'

import { AuthService, User } from '../../../auth/shared/services/auth/auth.service';
import { ProfileService, Profile } from '../../../auth/shared/services/profile/profile.service';
import { TeamsService, Team } from '../../shared/services/teams/teams.service';
import { GroupsService, Group } from '../../shared/services/groups/groups.service';

import { Store, State } from 'src/store';

export interface usState {
  abr: string,
  hyphen: string,
  name: string
}

@Component({
  selector: 'app-resources',
  templateUrl: './resources.component.html',
  styleUrls: ['./resources.component.scss'],
})

export class ResourcesComponent implements OnInit {
  user$: Observable<User>;
  profile$: Observable<Profile>;
  team$: Observable<Team>;
  groups$: Observable<Group[]>;
  subscriptions: Subscription[] = [];
  public team: string;
  public page: string;
  state: usState;
  local = [];
  custom = [];
  newResource: object = {
    url: null,
    name: null
  };

  states = [
    { abr: "AL", hyphen: "alabama", name: "Alabama" },
    { abr: "AK", hyphen: "alaska", name: "Alaska" },
    { abr: "AZ", hyphen: "arizona", name: "Arizona" },
    { abr: "AR", hyphen: "arkansas", name: "Arkansas" },
    { abr: "CA", hyphen: "california", name: "California" },
    { abr: "CO", hyphen: "colorado", name: "Colorado" },
    { abr: "CT", hyphen: "connecticut", name: "Connecticut" },
    { abr: "DE", hyphen: "delaware", name: "Delaware" },
    { abr: "DC", hyphen: "district-of-columbia", name: "District Of Columbia" },
    { abr: "FL", hyphen: "florida", name: "Florida" },
    { abr: "GA", hyphen: "georgia", name: "Georgia" },
    { abr: "HI", hyphen: "hawaii", name: "Hawaii" },
    { abr: "ID", hyphen: "idaho", name: "Idaho" },
    { abr: "IL", hyphen: "illinois", name: "Illinois" },
    { abr: "IN", hyphen: "indiana", name: "Indiana" },
    { abr: "IA", hyphen: "iowa", name: "Iowa" },
    { abr: "KS", hyphen: "kansas", name: "Kansas" },
    { abr: "KY", hyphen: "kentucky", name: "Kentucky" },
    { abr: "LA", hyphen: "louisiana", name: "Louisiana" },
    { abr: "ME", hyphen: "maine", name: "Maine" },
    { abr: "MD", hyphen: "maryland", name: "Maryland" },
    { abr: "MA", hyphen: "massachusetts", name: "Massachusetts" },
    { abr: "MI", hyphen: "michigan", name: "Michigan" },
    { abr: "MN", hyphen: "minnesota", name: "Minnesota" },
    { abr: "MS", hyphen: "mississippi", name: "Mississippi" },
    { abr: "MO", hyphen: "missouri", name: "Missouri" },
    { abr: "MT", hyphen: "montana", name: "Montana" },
    { abr: "NE", hyphen: "nebraska", name: "Nebraska" },
    { abr: "NV", hyphen: "nevada", name: "Nevada" },
    { abr: "NH", hyphen: "new-hampshire", name: "New Hampshire" },
    { abr: "NJ", hyphen: "new-jersey", name: "New Jersey" },
    { abr: "NM", hyphen: "new-mexico", name: "New Mexico" },
    { abr: "NY", hyphen: "new-york", name: "New York" },
    { abr: "NC", hyphen: "north-carolina", name: "North Carolina" },
    { abr: "ND", hyphen: "north-dakota", name: "North Dakota" },
    { abr: "OH", hyphen: "ohio", name: "Ohio" },
    { abr: "OK", hyphen: "oklahoma", name: "Oklahoma" },
    { abr: "OR", hyphen: "oregon", name: "Oregon" },
    { abr: "PA", hyphen: "pennsylvania", name: "Pennsylvania" },
    { abr: "RI", hyphen: "rhode-island", name: "Rhode Island" },
    { abr: "SC", hyphen: "south-carolina", name: "South Carolina" },
    { abr: "SD", hyphen: "south-dakota", name: "South Dakota" },
    { abr: "TN", hyphen: "tennessee", name: "Tennessee" },
    { abr: "TX", hyphen: "texas", name: "Texas" },
    { abr: "UT", hyphen: "utah", name: "Utah" },
    { abr: "VT", hyphen: "vermont", name: "Vermont" },
    { abr: "VA", hyphen: "virginia", name: "Virginia" },
    { abr: "WA", hyphen: "washington", name: "Washington" },
    { abr: "WV", hyphen: "west-virginia", name: "West Virginia" },
    { abr: "WI", hyphen: "wisconsin", name: "Wisconsin" },
    { abr: "WY", hyphen: "wyoming", name: "Wyoming" }
  ]

  national = [
    { url: `https://www.nacdd.org/`, name: "National Assoc. of Councils on Developmental Disabilities" }
  ]

  constructor(
    private store: Store,
    private activatedRoute: ActivatedRoute,
    private authService: AuthService,
    private profileService: ProfileService,
    private teamsService: TeamsService,
    public alertController: AlertController
  ) { }

  ngOnInit() {
    this.profile$ = this.store.select<Profile>('profile');
    this.groups$ = this.store.select<Group[]>('groups');
    this.subscriptions = [
      //this.authService.auth$.subscribe(),
      //this.profileService.profile$.subscribe(),
      //this.teamsService.teams$.subscribe()
    ];
    this.team$ = this.activatedRoute.params
      .pipe(switchMap(param => this.teamsService.getTeam(param.id)));
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  getLocal(event) {
    if (this.state) {
      this.local.push(
        { url: `https://www.childcareaware.org/state/${this.state.hyphen}/`, name: "Child Care Aware" },
        { url: `https://mchb.tvisdata.hrsa.gov/State/Detail/${this.state.abr}`, name: "Maternal and Child Health Services" }
      )
    }
  }

  async viewSite(link) {
    await Browser.open({ url: link.url });
  }

  async addResource() {
    const alert = await this.alertController.create({
      header: 'Add Team Resource',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Page name'
        },
        {
          name: 'url',
          type: 'text',
          placeholder: 'Page url (https://...)'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {
            console.log('Confirm Cancel');
          }
        }, {
          text: 'Add',
          handler: data => {
            console.log('Confirm Add', data);
            this.custom.push(data)
          }
        }
      ]
    });

    await alert.present();
  }

}
