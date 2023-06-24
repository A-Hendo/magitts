import { MagitCherryPickingState } from '../../models/magitCherryPickingState';
import { Commit } from '../../typings/git';
import { CommitItemView } from '../commits/commitSectionView';
import { LineBreakView } from '../general/lineBreakView';
import { Section, SectionHeaderView } from '../general/sectionHeader';
import { View } from '../general/view';

export class CherryPickingSectionView extends View {
	isFoldable = true;

	get id() { return 'CherryPicking'; }

	constructor (cherryPickingState: MagitCherryPickingState, log: Commit[]) {
		super();

		const doneCommits: Commit[] = [];

		for (const commit of log) {
			if (commit.hash === cherryPickingState.originalHead.hash) {
				break;
			}
			doneCommits.push(commit);
		}

		this.subViews = [
			new SectionHeaderView(Section.CherryPicking),
			...cherryPickingState.upcomingCommits.map(commit => new CommitItemView(commit, 'pick')),
			new CommitItemView(cherryPickingState.currentCommit, 'join'),
			...doneCommits.map(commit => new CommitItemView(commit, 'done')),
			new CommitItemView(cherryPickingState.originalHead, 'onto'),
			new LineBreakView()
		];
	}
}