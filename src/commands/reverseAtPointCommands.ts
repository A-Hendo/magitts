import { window } from 'vscode';
import { MagitRepository } from '../models/magitRepository';
import MagitUtils from '../utils/magitUtils';
import { BranchListingView } from '../views/branches/branchListingView';
import { CommitItemView } from '../views/commits/commitSectionView';
import { DocumentView } from '../views/general/documentView';
import { RemoteBranchListingView } from '../views/remotes/remoteBranchListingView';
import { StashItemView } from '../views/stashes/stashSectionView';
import { TagListingView } from '../views/tags/tagListingView';
import * as Reverting from './revertingCommands';

export async function reverseAtPoint(repository: MagitRepository, currentView: DocumentView): Promise<any> {

	const selectedView = currentView.click(window.activeTextEditor!.selection.active);

	if (selectedView instanceof CommitItemView) {

		const commit = (selectedView as CommitItemView).commit;

		return Reverting.revert(repository, commit.hash, { noCommit: true });

	} else if (selectedView instanceof BranchListingView ||
		selectedView instanceof RemoteBranchListingView ||
		selectedView instanceof TagListingView) {

		const ref = (selectedView as BranchListingView).ref;

		if (ref.commit) {
			return Reverting.revert(repository, ref.commit, { noCommit: true });
		}

	} else if (selectedView instanceof StashItemView) {

		//   const stash = (selectedView as StashItemView).stash;

		//   const args = ['stash', 'apply', '--index', `stash@{${stash.index}}`];
		//   return gitRun(repository.gitRepository, args);
	} else {
		const ref = await MagitUtils.chooseRef(repository, 'Revert changes', true, true);

		if (ref) {
			return Reverting.revert(repository, ref, { noCommit: true });
		}
	}
}