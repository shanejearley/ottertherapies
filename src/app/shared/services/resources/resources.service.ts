import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import { firestore } from 'firebase/app';
import 'firebase/storage';

import { Store } from 'src/store';
import { Profile } from '../../../../auth/shared/services/profile/profile.service'

import { Observable } from 'rxjs';
import { tap, filter, map, shareReplay } from 'rxjs/operators';

import { MembersService } from '../members/members.service';
import { AngularFireFunctions } from '@angular/fire/functions';

export interface Resource {
    url: string,
    level: string,
    name: string,
    preview: any;
    id: string
}

@Injectable()
export class ResourcesService {
    private resourcesCol: AngularFirestoreCollection<Resource>;
    resource$: Observable<Resource>;
    teamId: string;
    uid: string;
    resources: Resource[];
    resources$;

    constructor(
        private store: Store,
        private db: AngularFirestore,
        private fns: AngularFireFunctions
    ) { }

    links = [
        { url: `https://thearc.org/`, name: "The ARC", level: "National", preview: null, id: null },
        { url: `https://www.childcareaware.org/`, name: "Child Care Aware", level: "National", preview: null, id: null },
        // { url: `https://www.asha.org/`, name: "American Speech-Language-Hearing Association (ASHA)", level: "National", preview: null, id: null }
        // { url: `https://www.nacdd.org/`, name: "National Assoc. of Councils on Developmental Disabilities", level: "National", preview: null, id: null },
        // { url: `https://iris.peabody.vanderbilt.edu/`, name: "IRIS Center", level: "National", preview: null, id: null },
        // { url: `https://www2.ed.gov/about/offices/list/osers/osep/index.html`, name: "Office of Special Education and Rehabilitative Services", level: "National", preview: null, id: null },
        // { url: `https://ncd.gov/`, name: "National Council on Disability", level: "National", preview: null, id: null },
    ]

    resourcesObservable(userId, teamId) {
        this.resources$ = null;
        this.resources = this.links;
        this.resources.forEach(resource => {
            this.getInfo(resource);
        })
        this.store.set('resources', this.resources)
        this.uid = userId;
        this.teamId = teamId;
        this.resourcesCol = this.db.collection<Resource>(`teams/${this.teamId}/resources`);
        this.resources$ = this.resourcesCol.stateChanges(['added', 'modified', 'removed'])
            .pipe(
                map(actions => actions.map(a => {
                    console.log('ACTION', a);
                    if (a.type == 'removed') {
                        const resource = a.payload.doc.data() as Resource;
                        resource.id = a.payload.doc.id;
                        this.resources.forEach(r => {
                            if (r.id === resource.id) {
                                var index = this.resources.indexOf(r);
                                this.resources.splice(index, 1);
                            }
                        });
                    }
                    if (a.type == 'added' || a.type == 'modified') {
                        const resource = a.payload.doc.data() as Resource;
                        resource.id = a.payload.doc.id;
                        const exists = this.resources.find(r => r.id === resource.id)
                        if (!exists) {
                            this.getInfo(resource);
                            this.resources.push(resource);
                        } else {
                            this.resources.find(r => r.id == resource.id).url = resource.url;
                        }
                    }
                    return this.store.set('resources', this.resources)
                })),
                shareReplay(1)
            )
        return this.resources$;
    }

    getInfo(resource: Resource) {
        this.fns.httpsCallable('scraper')({ text: `${resource.url}` })
            .pipe(
                tap(next => {
                    if (!next) {
                        return;
                    }
                    resource.preview = next;
                }),
                shareReplay(1)
            ).subscribe()
    }

    getResource(id: string) {
        return this.store.select<Resource[]>('resources')
            .pipe(
                filter(Boolean),
                map((resource: Resource[]) => resource.find((resource: Resource) => resource.id === id)));
    }

    removeLink(linkId: string) {
        const resourceDoc = this.db.doc<Resource>(`teams/${this.teamId}/resources/${linkId}`)
        return resourceDoc.delete();
    }

    addResource(resource: Resource) {
        this.resourcesCol = this.db.collection<Resource>(`teams/${this.teamId}/resources`);
        this.resourcesCol.add(resource);
    }

}