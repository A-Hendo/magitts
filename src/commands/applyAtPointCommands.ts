import { window } from 'vscode';
import { MagitRepository } from '../models/magitRepository';
import { gitRun } from '../utils/gitRawRunner';
import MagitUtils from '../utils/magitUtils';
import { BranchListingView } from '../views/branches/branchListingView';
import { CommitItemView } from '../views/commits/commitSectionView';
import { DocumentView } from '../views/general/documentView';
import { RemoteBranchListingView } from '../views/remotes/remoteBranchListingView';
import { StashItemView } from '../views/stashes/stashSectionView';
import { TagListingView } from '../views/tags/tagListingView';
import * as CherryPicking from './cherryPickingCommands';

export async function magitApplyEntityAtPoint(repository: MagitRepository, currentView: DocumentView): Promise<any> {

	const selectedView = currentView.click(window.activeTextEditor!.selection.active);

	if (selectedView instanceof CommitItemView) {

		const commit = (selectedView as CommitItemView).commit;

		return CherryPicking.cherryPick(repository, commit.hash, { noCommit: true });

	} else if (selectedView instanceof BranchListingView ||
		selectedView instanceof RemoteBranchListingView ||
		selectedView instanceof TagListingView) {

		const ref = (selectedView as BranchListingView).ref;

		if (ref.commit) {
			return CherryPicking.cherryPick(repository, ref.commit, { noCommit: true });
		}

	} else if (selectedView instanceof StashItemView) {

		const stash = (selectedView as StashItemView).stash;

		const args = ['stash', 'apply', '--index', `stash@{${stash.index}}`];
		return gitRun(repository.gitRepository, args);
	} else {
		const ref = await MagitUtils.chooseRef(repository, 'Apply changes from commit');

		if (ref) {
			return CherryPicking.cherryPick(repository, ref, { noCommit: true });
		}
	}
}

interface ApplyOptions {
	index?: boolean;
	reverse?: boolean;
}

export async function apply(repository: MagitRepository, patch: string, { index, reverse }: ApplyOptions) {

	const args = ['apply', '--ignore-space-change'];

	if (index) {
		args.push('--cached');
	}

	if (reverse) {
		args.push('--reverse');
	}

	return gitRun(repository.gitRepository, args, { input: patch });
}