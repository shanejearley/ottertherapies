import { Component, AfterViewInit, Input, ViewChild, ElementRef, Renderer2 } from "@angular/core";


@Component({
    selector: 'app-expandable',
    styleUrls: ['expandable.component.scss'],
    templateUrl: 'expandable.component.html'
})
export class ExpandableComponent implements AfterViewInit {
    @ViewChild("expandWrapper", { read: ElementRef }) expandWrapper: ElementRef;
    @Input("show") show: boolean = false;
    @Input("expandHeight") expandHeight: number = 1;

    constructor(public renderer: Renderer2) { }

    ngAfterViewInit() {
        this.renderer.setStyle(this.expandWrapper.nativeElement, "max-height", this.expandHeight < 1 ? 250 + 'px' : this.expandHeight * 250 + 'px');
    }
}