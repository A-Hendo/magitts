import { Uri } from 'vscode';
import * as Constants from '../common/constants';
import { MagitCommit } from '../models/magitCommit';
import { MagitRepository } from '../models/magitRepository';
import { DocumentView } from './general/documentView';
import { TextView } from './general/textView';

export class CommitDetailView extends DocumentView {

	static UriPath: string = 'commit.magit';
	isHighlightable = false;
	needsUpdate = false;

	constructor (uri: Uri, public commit: MagitCommit, diff: string) {
		super(uri);

		const commitTextView = new TextView(diff);
		commitTextView.isHighlightable = false;
		this.addSubview(commitTextView);
	}

	public update(state: MagitRepository): void { }

	static encodeLocation(repository: MagitRepository, commitHash: string): Uri {
		return Uri.parse(`${Constants.MagitUriScheme}:${CommitDetailView.UriPath}?${repository.uri.fsPath}#${commitHash}`);
	}
}