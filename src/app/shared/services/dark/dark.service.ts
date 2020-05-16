import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { Store } from 'src/store';

@Injectable()
export class DarkService {

    constructor(
        private store: Store
    ) { }

    // Observable string sources
    private darkSource = new Subject<boolean>();

    // Observable string streams
    dark$ = this.darkSource.asObservable();

    // Service message commands
    toggle(dark: boolean) {
        try {
            this.darkSource.next(dark);
            this.store.set('dark', dark);
        } catch (err) {
            console.log(err);
        }
    }

}