import * as Commit from '../commands/commitCommands';
import { MenuState, MenuUtil, Switch } from '../menu/menu';
import { MagitRepository } from '../models/magitRepository';
import CommandUtils from '../utils/commandUtils';
import { gitRun } from '../utils/gitRawRunner';
import MagitUtils from '../utils/magitUtils';

const mergingMenu = {
	title: 'Merging',
	commands: [
		{ label: 'm', description: 'Merge', action: merge },
		{ label: 'e', description: 'Merge and edit message', action: (state: MenuState) => merge(state, false, false, true) },
		{ label: 'n', description: 'Merge, don\'t commit', action: (state: MenuState) => merge(state, true, false, false) },
		{ label: 'a', description: 'Absorb', action: absorb },
		// { label: 'p', description: 'Preview Merge', action: mergePreview },
		{ label: 's', description: 'Squash Merge', action: (state: MenuState) => merge(state, false, true, false) },
		// { label: 'i', description: 'Merge into', action: mergeInto },
	]
};

const whileMergingMenu = {
	title: 'Merging',
	commands: [
		{ label: 'm', description: 'Commit merge', action: commitMerge },
		{ label: 'a', description: 'Abort merge', action: abortMerge }
	]
};

export async function merging(repository: MagitRepository) {
	const switches = [
		{ label: '-f', name: '--ff-only', description: 'Fast-forward only' },
		{ label: '-n', name: '--no-ff', description: 'No fast-forward' },
		{ label: '-s', name: '--strategy=', description: 'Strategy', action: async (menuState: MenuState) => await CommandUtils.GetInputOptions('-s', '--strategy=', ['subtree', 'ours', 'octopus', 'resolve', 'recursive'], menuState) },
		{ label: '-X', name: '--strategy-option=', description: 'Strategy Option', action: async (menuState: MenuState) => await CommandUtils.GetInputOptions('-X', '--strategy-option=', ['ours', 'theirs', 'patience'], menuState) },
		{ label: '-b', name: '-Xignore-space-change', description: 'Ignore changes in amount of whitespace' },
		{ label: '-w', name: '-Xignore-all-space', description: 'Ignore whitespace when comparing lines' },
		{ label: '-A', name: '-Xdiff-algorithm=', description: 'Diff algorithm', action: async (menuState: MenuState) => await CommandUtils.GetInputOptions('-A', '-Xdiff-algorithm=', ['default', 'm', 'patience'], menuState) },
		{ label: '-S', name: '--gpg-sign=', description: 'Sign using gpg', action: async (menuState: MenuState) => await CommandUtils.GetSwitchInput('-S', '--gpg-sign=', menuState) },
	];

	if (repository.mergingState) {
		return MenuUtil.showMenu(whileMergingMenu, { repository });
	} else {
		return MenuUtil.showMenu(mergingMenu, { repository, switches });
	}
}

async function merge(
	{ repository, switches }: MenuState,
	noCommit = false,
	squashMerge = false,
	editMessage = false
) {
	const ref = await MagitUtils.chooseRef(repository, 'Merge');

	if (ref) {
		return _merge(
			repository,
			ref,
			noCommit,
			squashMerge,
			editMessage,
			switches
		);
	}
}

// async function mergeInto({ repository }: MenuState) {

// }

async function absorb({ repository }: MenuState) {
	const ref = await MagitUtils.chooseRef(repository, 'Absorb');

	if (ref) {
		await _merge(repository, ref);
		return await gitRun(repository.gitRepository, ['branch', '--delete', ref]);
	}
}

// async function mergePreview() {
//   // Commands to preview a merge between ref1 and ref2:
//   // git merge-base HEAD {ref2}
//   // git merge-tree {MERGE-BASE} HEAD {ref2}
//   // https://stackoverflow.com/questions/501407/is-there-a-git-merge-dry-run-option/6283843#6283843
// }

async function _merge(
	repository: MagitRepository,
	ref: string,
	noCommit = false,
	squashMerge = false,
	editMessage = false,
	switches: Switch[] = []
) {
	const args = ['merge', ...MenuUtil.switchesToArgs(switches), ref];

	if (noCommit) {
		args.push(...['--no-commit', '--no-ff']);
	}

	if (squashMerge) {
		args.push('--squash');
	}

	if (editMessage) {

		args.push(...['--edit', '--no-ff']);
		return Commit.runCommitLikeCommand(repository, args, { updatePostCommitTask: true });
	} else {
		args.push('--no-edit');
	}

	return gitRun(repository.gitRepository, args);
}

async function commitMerge(menuState: MenuState) {
	return Commit.commit(menuState);
}

async function abortMerge({ repository }: MenuState) {
	if (await MagitUtils.confirmAction(`Abort merge?`)) {
		const args = ['merge', '--abort'];
		return gitRun(repository.gitRepository, args);
	}
}