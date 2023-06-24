import { MagitCherryPickingState } from '../../models/magitCherryPickingState';
import { MagitRevertingState } from '../../models/magitRevertingState';
import { Commit } from '../../typings/git';
import { CommitItemView } from '../commits/commitSectionView';
import { LineBreakView } from '../general/lineBreakView';
import { Section, SectionHeaderView } from '../general/sectionHeader';
import { View } from '../general/view';

export class RevertingSectionView extends View {
	isFoldable = true;

	get id() { return 'Reverting'; }

	constructor (revertingState: MagitRevertingState, log: Commit[]) {
		super();

		const doneCommits: Commit[] = [];

		for (const commit of log) {
			if (commit.hash === revertingState.originalHead.hash) {
				break;
			}
			doneCommits.push(commit);
		}

		this.subViews = [
			new SectionHeaderView(Section.Reverting),
			...revertingState.upcomingCommits.map(commit => new CommitItemView(commit, 'revert')),
			new CommitItemView(revertingState.currentCommit, 'join'),
			...doneCommits.map(commit => new CommitItemView(commit, 'done')),
			new CommitItemView(revertingState.originalHead, 'onto'),
			new LineBreakView()
		];
	}
}