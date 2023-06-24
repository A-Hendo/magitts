import { MagitRebasingState } from '../../models/magitRebasingState';
import { CommitItemView } from '../commits/commitSectionView';
import { LineBreakView } from '../general/lineBreakView';
import { UnclickableTextView } from '../general/textView';
import { View } from '../general/view';

export class RebasingSectionView extends View {
	isFoldable = true;

	get id() { return 'Rebasing'; }

	constructor (rebasingState: MagitRebasingState) {
		super();
		this.subViews = [
			new UnclickableTextView(`Rebasing ${rebasingState.origBranchName} onto ${rebasingState.onto.name}`),
			...rebasingState.upcomingCommits.map(c => new CommitItemView(c, 'pick')),
			new CommitItemView(rebasingState.currentCommit, 'join'),
			...rebasingState.doneCommits.map(c => new CommitItemView(c, 'done')),
			new CommitItemView(rebasingState.onto.commitDetails, 'onto'),
			new LineBreakView()
		];
	}
}