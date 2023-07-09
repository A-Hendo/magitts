import * as CommitCommands from '../commands/commitCommands';
import { MenuState, MenuUtil } from '../menu/menu';
import { MagitRepository } from '../models/magitRepository';
import CommandUtils from '../utils/commandUtils';
import { gitRun } from '../utils/gitRawRunner';
import MagitUtils from '../utils/magitUtils';

const whileCherryPickingMenu = {
	title: 'Cherry-picking',
	commands: [
		{ label: 'A', description: 'Continue', action: continueCherryPick },
		{ label: 's', description: 'Skip', action: (state: MenuState) => cherryPickControlCommand(state, '--skip') },
		{ label: 'a', description: 'Abort', action: (state: MenuState) => cherryPickControlCommand(state, '--abort') }
	]
};

const cherryPickingMenu = {
	title: 'Cherry-picking',
	commands: [
		{ label: 'A', description: 'Pick', action: pick },
		{ label: 'a', description: 'Apply', action: applySomeCommit },
		// { label: 'h', description: 'Harvest', action: checkout },
		// { label: 'd', description: 'Donate', action: checkout },
		// { label: 'n', description: 'Spinout', action: checkout },
		// { label: 's', description: 'Spinoff', action: checkout },
	]
};

export async function cherryPicking(repository: MagitRepository) {

	if (repository.cherryPickingState) {
		return MenuUtil.showMenu(whileCherryPickingMenu, { repository });
	} else {
		const switches = [
			{ label: '-e', name: '--edit', description: 'Edit commit messages' },
			{ label: '-x', name: '-x', description: 'Reference cherry in commit message' },
			{ label: '-F', name: '--ff', description: 'Attempt fast-forward', activated: true, },
			{ label: '-s', name: '--signoff', description: 'Add Signed-off-by lines' },
			{ label: '-S', name: '--gpg-sign=', description: 'Sign using gpg', action: async (menuState: MenuState) => await CommandUtils.GetSwitchInput('-S', '--gpg-sign=', menuState) },

		];
		const options = [
			{ label: '=s', name: '--strategy=', description: 'Strategy', action: async (menuState: MenuState) => await CommandUtils.GetInputOptions('=s', '--strategy=', ['subtree', 'ours', 'octopus', 'resolve', 'recursive'], menuState) },
		]

		return MenuUtil.showMenu(cherryPickingMenu, { repository, switches, options });
	}
}

async function pick({ repository, switches }: MenuState) {
	const target = await MagitUtils.chooseRef(repository, 'Cherry-pick');

	if (target) {
		return cherryPick(repository, target, { edit: switches?.find(s => s.label === '-e' && s.activated) ? true : false });
	}
}

async function applySomeCommit({ repository }: MenuState) {
	const commit = await MagitUtils.chooseRef(repository, 'Apply changes from commit');

	if (commit) {
		return cherryPick(repository, commit, { noCommit: true });
	}
}

interface CherryPickOptions {
	noCommit?: boolean;
	edit?: boolean;
}

export async function cherryPick(repository: MagitRepository, target: string, { noCommit, edit }: CherryPickOptions = {}) {

	const args = ['cherry-pick'];

	if (noCommit) {
		args.push('--no-commit');
	} else if (edit) {
		args.push('--edit');
		args.push(target);
		return CommitCommands.runCommitLikeCommand(repository, args, { updatePostCommitTask: true });
	} else {
		args.push('--ff');
	}

	args.push(target);
	return gitRun(repository.gitRepository, args);
}

async function continueCherryPick({ repository }: MenuState) {
	const args = ['cherry-pick', '--continue'];
	return CommitCommands.runCommitLikeCommand(repository, args);
}

async function cherryPickControlCommand({ repository }: MenuState, command: string) {
	const args = ['cherry-pick', command];
	return gitRun(repository.gitRepository, args);
}
