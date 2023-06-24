import { Uri, window, workspace } from 'vscode';
import { MenuState, MenuUtil } from '../menu/menu';
import { MagitRepository } from '../models/magitRepository';
import { SpawnOptions } from '../utils/commandRunner/command';
import { LogLevel, gitRun } from '../utils/gitRawRunner';
import * as ProcessCommands from './processCommands';

const runningMenu = {
	title: 'Running',
	commands: [
		{ label: '!', description: 'Git subcommand (in topdir)', action: ({ repository }: MenuState) => run(repository) },
		{ label: 'p', description: 'Git subcommand (in pwd)', action: ({ repository }: MenuState) => run(repository, workspace.getWorkspaceFolder(repository.uri)?.uri) }
	]
};

export async function running(repository: MagitRepository) {
	return MenuUtil.showMenu(runningMenu, { repository });
}

async function run(repository: MagitRepository, directory?: Uri) {

	const userCommand = await window.showInputBox({ value: 'git ' });

	let spawnOptions: SpawnOptions = {};

	if (directory) {
		spawnOptions.cwd = directory.fsPath;
	}

	if (userCommand) {
		const args = userCommand.replace('git ', '').split(' ');
		await gitRun(repository.gitRepository, args, spawnOptions, LogLevel.Detailed);

		await ProcessCommands.processView(repository);

		return;
	}
}