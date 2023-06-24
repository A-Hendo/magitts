import { MagitRemote } from '../../models/magitRemote';
import { LineBreakView } from '../general/lineBreakView';
import { Section, SectionHeaderView } from '../general/sectionHeader';
import { View } from '../general/view';
import { RemoteBranchListingView } from './remoteBranchListingView';

export class RemoteSectionView extends View {
	isFoldable = true;

	get id() { return `${Section.Remote.toString()} ${this.remote.name} (${this.remote.fetchUrl ?? this.remote.pushUrl})`; }

	constructor (private remote: MagitRemote) {
		super();
		this.subViews = [
			new SectionHeaderView(Section.Remote, remote.branches.length, `${remote.name} (${remote.fetchUrl ?? remote.pushUrl})`),
			...remote.branches.map(branch => new RemoteBranchListingView(branch)),
			new LineBreakView()
		];
	}
}