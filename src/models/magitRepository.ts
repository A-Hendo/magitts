import { Uri } from 'vscode';
import { ForgeState } from '../forge/model/forgeState';
import { PullRequest } from '../forge/model/pullRequest';
import { Commit, Ref, Repository, Submodule } from '../typings/git';
import { MagitBranch } from './magitBranch';
import { MagitChange } from './magitChange';
import { MagitCherryPickingState } from './magitCherryPickingState';
import { MagitMergingState } from './magitMergingState';
import { MagitRebasingState } from './magitRebasingState';
import { MagitRemote } from './magitRemote';
import { MagitRevertingState } from './magitRevertingState';
import { Stash } from './stash';

export interface MagitRepository {
	readonly uri: Uri;
	readonly HEAD?: MagitBranch;
	readonly workingTreeChanges: MagitChange[];
	readonly indexChanges: MagitChange[];
	readonly mergeChanges: MagitChange[];
	readonly untrackedFiles: MagitChange[];
	readonly stashes: Stash[];
	readonly log: Commit[];
	readonly rebasingState?: MagitRebasingState;
	readonly mergingState?: MagitMergingState;
	readonly cherryPickingState?: MagitCherryPickingState;
	readonly revertingState?: MagitRevertingState;
	readonly branches: Ref[];
	readonly remotes: MagitRemote[];
	readonly tags: Ref[];
	readonly refs: Ref[];
	readonly submodules: Submodule[];
	readonly gitRepository: Repository;

	readonly forgeState?: ForgeState;
}