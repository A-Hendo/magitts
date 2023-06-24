import { Uri } from 'vscode';
import * as Constants from '../common/constants';
import { MagitRepository } from '../models/magitRepository';
import { BranchesSectionView } from './branches/branchesSectionView';
import { DocumentView } from './general/documentView';
import { Section, SectionHeaderView } from './general/sectionHeader';
import { RemoteSectionView } from './remotes/remoteSectionView';
import { TagSectionView } from './tags/tagSectionView';

export default class ShowRefsView extends DocumentView {

	static UriPath: string = 'refs.magit';

	constructor (uri: Uri, magitState: MagitRepository) {
		super(uri);
		this.provideContent(magitState);
	}

	provideContent(magitState: MagitRepository) {

		this.subViews = [
			new SectionHeaderView(Section.HEAD),
			new BranchesSectionView(magitState.branches, magitState.HEAD),
			...magitState.remotes.map(remote => new RemoteSectionView(remote)),
			new TagSectionView(magitState.tags)
		];
	}

	public update(state: MagitRepository): void {
		this.provideContent(state);
		this.triggerUpdate();
	}

	static encodeLocation(repository: MagitRepository): Uri {
		return Uri.parse(`${Constants.MagitUriScheme}:${ShowRefsView.UriPath}?${repository.uri.fsPath}`);
	}
}