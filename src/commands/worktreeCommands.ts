import { window } from 'vscode';
import { MenuState, MenuUtil } from '../menu/menu';
import { MagitRepository } from '../models/magitRepository';
import { gitRun } from '../utils/gitRawRunner';
import MagitUtils from '../utils/magitUtils';

const worktreeMenu = {
	title: 'Worktree',
	commands: [
		{ label: 'b', description: 'Create new worktree', action: createWorktree },
		{ label: 'c', description: 'Create new branch and worktree', action: createWorktreeAndBranch },
		// { label: 'k', description: 'Delete worktree', action: deleteWorktree }
	]
};

export async function worktree(repository: MagitRepository) {

	return MenuUtil.showMenu(worktreeMenu, { repository });
}

async function createWorktree({ repository }: MenuState) {

	const ref = await MagitUtils.chooseRef(repository, 'Checkout ');

	if (ref) {
		const worktreePath = await window.showInputBox({ value: repository.uri.fsPath, prompt: 'Create worktree' });

		if (worktreePath) {
			const args = ['worktree', 'add', worktreePath, ref];
			return await gitRun(repository.gitRepository, args);
		}
	}
}

async function createWorktreeAndBranch({ repository }: MenuState) {

	const worktreePath = await window.showInputBox({ value: repository.uri.fsPath, prompt: 'Create worktree' });

	if (worktreePath) {

		const ref = await MagitUtils.chooseRef(repository, 'Create and checkout branch starting at');

		if (ref) {

			const branchName = await window.showInputBox({ prompt: 'Name for new branch' });

			if (branchName) {
				const args = ['worktree', 'add', '-b', branchName, worktreePath, ref];
				return await gitRun(repository.gitRepository, args);
			}
		}
	}
}
