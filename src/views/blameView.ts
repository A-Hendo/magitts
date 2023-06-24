import { Uri } from 'vscode';
import * as Constants from '../common/constants';
import { MagitRepository } from '../models/magitRepository';
import { DocumentView } from './general/documentView';
import { TextView } from './general/textView';

export class BlameView extends DocumentView {

	static UriPath: string = 'Blame.magit@';
	isHighlightable = false;
	needsUpdate = false;

	constructor (uri: Uri, private blame: string) {
		super(uri);

		const blameTextView = new TextView(blame);
		blameTextView.isHighlightable = false;
		this.addSubview(blameTextView);
	}

	public update(state: MagitRepository): void { }

	static index = 0;
	static encodeLocation(repository: MagitRepository, fileUri: Uri): Uri {
		return Uri.parse(`${Constants.MagitUriScheme}:${BlameView.UriPath}/${fileUri.path}?${repository.uri.fsPath}#${fileUri.path}#${BlameView.index++}`);
	}
}