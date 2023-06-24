import { EventEmitter, Uri } from 'vscode';
import { MagitRepository } from '../../models/magitRepository';
import { View } from './view';

export abstract class DocumentView extends View {

	isHighlightable = false;

	public emitter?: EventEmitter<Uri>;
	needsUpdate: boolean = true;

	constructor (public uri: Uri) {
		super();
	}

	public abstract update(state: MagitRepository): void;

	public triggerUpdate() {
		if (this.emitter) {
			this.emitter.fire(this.uri);
		}
	}
}