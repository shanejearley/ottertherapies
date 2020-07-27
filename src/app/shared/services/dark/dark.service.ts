import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { Store } from 'src/store';

@Injectable()
export class DarkService {

    constructor(
        private store: Store
    ) { }

    private toggleDarkTheme(shouldAdd) {
        document.body.classList.toggle('dark', shouldAdd);
    }

    // Observable string sources
    private darkSource = new Subject<boolean>();

    // Observable string streams
    dark$ = this.darkSource.asObservable();

    // Service message commands
    async toggle(dark: boolean) {
        try {
            await this.toggleDarkTheme(dark);
            await this.darkSource.next(dark);
            return this.store.set('dark', dark);
        } catch (err) {
            return console.log(err);
        }
    }

}