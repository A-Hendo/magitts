import { Branch, Commit, Ref, UpstreamRef } from '../typings/git';

export interface MagitBranch extends Branch {
	commitDetails: Commit;
	upstreamRemote?: MagitUpstreamRef;
	pushRemote?: MagitUpstreamRef;
	tag?: Ref;
}

export interface MagitUpstreamRef extends UpstreamRef {
	commit?: Commit;
	commitsAhead?: Commit[];
	commitsBehind?: Commit[];
	rebase?: boolean;
}