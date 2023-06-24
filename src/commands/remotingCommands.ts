import { commands, window } from 'vscode';
import { MenuState, MenuUtil } from '../menu/menu';
import { MagitRepository } from '../models/magitRepository';
import { gitRun } from '../utils/gitRawRunner';

const remotingMenu = {
	title: 'Remoting',
	commands: [
		{ label: 'a', description: 'Add', action: addRemote },
		{ label: 'r', description: 'Rename', action: renameRemote },
		{ label: 'k', description: 'Remove', action: removeRemote }
	]
};

export async function remoting(repository: MagitRepository) {
	return MenuUtil.showMenu(remotingMenu, { repository });
}

async function addRemote() {
	return commands.executeCommand('git.addRemote');
}

async function renameRemote({ repository }: MenuState) {

	const remote = await window.showQuickPick(repository.remotes.map(r => r.name), { placeHolder: 'Rename remote' });

	if (remote) {

		const newName = await window.showInputBox({ prompt: `Rename ${remote} to` });

		if (newName) {
			const args = ['remote', 'rename', remote, newName];
			gitRun(repository.gitRepository, args);
		}
	}
}

async function removeRemote() {
	return commands.executeCommand('git.removeRemote');
}