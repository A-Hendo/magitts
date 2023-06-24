import { Commit, Ref, UpstreamRef } from '../../typings/git';
import { LineBreakView } from '../general/lineBreakView';
import { Section, SectionHeaderView } from '../general/sectionHeader';
import { View } from '../general/view';
import { CommitItemView } from './commitSectionView';

export class UnsourcedCommitSectionView extends View {
	isFoldable = true;

	get id() { return this.section.toString(); }

	constructor (private section: Section, upstream: UpstreamRef, commits: Commit[], refs: Ref[]) {
		super();
		this.subViews = [
			new SectionHeaderView(section, commits.length, `${upstream.remote}/${upstream.name}`),
			...commits.map(commit => new CommitItemView(commit, undefined, refs)),
			new LineBreakView()
		];
	}
}