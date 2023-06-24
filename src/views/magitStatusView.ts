import { Uri } from 'vscode';
import { getLatestGitError } from '../commands/commandPrimer';
import * as Constants from '../common/constants';
import { magitConfig } from '../extension';
import { MagitBranch } from '../models/magitBranch';
import { MagitRepository } from '../models/magitRepository';
import { BranchHeaderSectionView } from './branches/branchHeaderSectionView';
import { ChangeSectionView } from './changes/changesSectionView';
import { CherryPickingSectionView } from './cherryPicking/cherryPickingSectionView';
import { CommitSectionView } from './commits/commitSectionView';
import { UnsourcedCommitSectionView } from './commits/unsourcedCommitsSectionView';
import { ErrorMessageView } from './errorMessageView';
import { IssueSectionView } from './forge/issueSectionView';
import { PullRequestSectionView } from './forge/pullRequestSectionView';
import { DocumentView } from './general/documentView';
import { LineBreakView } from './general/lineBreakView';
import { Section } from './general/sectionHeader';
import { MergingSectionView } from './merging/mergingSectionView';
import { RebasingSectionView } from './rebasing/rebasingSectionView';
import { RevertingSectionView } from './reverting/revertingSectionView';
import { StashSectionView } from './stashes/stashSectionView';

export default class MagitStatusView extends DocumentView {

	static UriPath: string = 'status.magit';
	public HEAD?: MagitBranch;

	constructor (uri: Uri, magitState: MagitRepository) {
		super(uri);
		this.provideContent(magitState);
	}

	provideContent(magitState: MagitRepository) {
		this.HEAD = magitState.HEAD;
		this.subViews = [];

		let latestGitError = getLatestGitError(magitState);
		if (latestGitError) {
			this.addSubview(new ErrorMessageView(latestGitError));
		}

		this.addSubview(new BranchHeaderSectionView(magitState.HEAD));

		this.addSubview(new LineBreakView());

		if (magitState.mergingState) {
			this.addSubview(new MergingSectionView(magitState.mergingState));
		}

		if (magitState.rebasingState) {
			this.addSubview(new RebasingSectionView(magitState.rebasingState));
		}

		if (magitState.cherryPickingState) {
			this.addSubview(new CherryPickingSectionView(magitState.cherryPickingState, magitState.log));
		}

		if (magitState.revertingState) {
			this.addSubview(new RevertingSectionView(magitState.revertingState, magitState.log));
		}

		if (magitState.untrackedFiles.length && !magitConfig.hiddenStatusSections.has('untracked')) {
			this.addSubview(new ChangeSectionView(Section.Untracked, magitState.untrackedFiles));
		}

		if ((magitState.workingTreeChanges.length || magitState.mergeChanges.length) && !magitConfig.hiddenStatusSections.has('unstaged')) {
			this.addSubview(new ChangeSectionView(Section.Unstaged, [...magitState.mergeChanges, ...magitState.workingTreeChanges]));
		}

		if (magitState.indexChanges.length && !magitConfig.hiddenStatusSections.has('staged')) {
			this.addSubview(new ChangeSectionView(Section.Staged, magitState.indexChanges));
		}

		if (magitState.stashes?.length && !magitConfig.hiddenStatusSections.has('stashes')) {
			this.addSubview(new StashSectionView(magitState.stashes));
		}

		const refs = magitState.remotes.reduce((prev, remote) => remote.branches.concat(prev), magitState.branches.concat(magitState.tags));

		if (magitState.HEAD?.upstreamRemote?.commitsAhead?.length && !magitConfig.hiddenStatusSections.has('unmerged')) {
			this.addSubview(new UnsourcedCommitSectionView(Section.UnmergedInto, magitState.HEAD.upstreamRemote, magitState.HEAD.upstreamRemote.commitsAhead, refs));
		} else if (magitState.HEAD?.pushRemote?.commitsAhead?.length && !magitConfig.hiddenStatusSections.has('unpushed')) {
			this.addSubview(new UnsourcedCommitSectionView(Section.UnpushedTo, magitState.HEAD.pushRemote, magitState.HEAD.pushRemote.commitsAhead, refs));
		}
		if (magitState.log.length > 0 && !magitState.HEAD?.upstreamRemote?.commitsAhead?.length && !magitConfig.hiddenStatusSections.has('recent commits')) {
			this.addSubview(new CommitSectionView(Section.RecentCommits, magitState.log.slice(0, 10), refs));
		}

		if (magitState.HEAD?.upstreamRemote?.commitsBehind?.length && !magitConfig.hiddenStatusSections.has('unpulled')) {
			this.addSubview(new UnsourcedCommitSectionView(Section.UnpulledFrom, magitState.HEAD.upstreamRemote, magitState.HEAD.upstreamRemote.commitsBehind, refs));
		} else if (magitState.HEAD?.pushRemote?.commitsBehind?.length) {
			this.addSubview(new UnsourcedCommitSectionView(Section.UnpulledFrom, magitState.HEAD.pushRemote, magitState.HEAD.pushRemote.commitsBehind, refs));
		}

		if (magitState.forgeState?.pullRequests?.length && !magitConfig.hiddenStatusSections.has('pull requests')) {
			this.addSubview(new PullRequestSectionView(magitState.forgeState?.pullRequests));
		}

		if (magitState.forgeState?.issues?.length && !magitConfig.hiddenStatusSections.has('issues')) {
			this.addSubview(new IssueSectionView(magitState.forgeState?.issues));
		}
	}

	public update(state: MagitRepository): void {
		this.provideContent(state);
		this.triggerUpdate();
	}

	static encodeLocation(repository: MagitRepository): Uri {
		return Uri.parse(`${Constants.MagitUriScheme}:${MagitStatusView.UriPath}?${repository.uri.fsPath}`);
	}
}