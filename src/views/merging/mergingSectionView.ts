import { MagitMergingState } from '../../models/magitMergingState';
import { CommitItemView } from '../commits/commitSectionView';
import { LineBreakView } from '../general/lineBreakView';
import { Section, SectionHeaderView } from '../general/sectionHeader';
import { TextView } from '../general/textView';
import { View } from '../general/view';

export class MergingSectionView extends View {
	isFoldable = true;

	get id() { return 'Merging'; }

	constructor (mergingState: MagitMergingState) {
		super();
		this.subViews = [
			new SectionHeaderView(Section.Merging, mergingState.commits.length, `${mergingState.mergingBranches[0]}`),
			...mergingState.commits.map(commit => new CommitItemView(commit)),
			new LineBreakView()
		];
	}
}