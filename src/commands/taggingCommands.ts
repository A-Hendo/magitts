import { window } from 'vscode';
import * as Commit from '../commands/commitCommands';
import { MenuState, MenuUtil } from '../menu/menu';
import { MagitRepository } from '../models/magitRepository';
import CommandUtils from '../utils/commandUtils';
import { gitRun } from '../utils/gitRawRunner';
import MagitUtils from '../utils/magitUtils';

const taggingMenu = {
	title: 'Tagging',
	commands: [
		{ label: 't', description: 'Create', action: createTag },
		{ label: 'k', description: 'Delete', action: deleteTag },
		// { label: 'p', description: 'Prune', action: pruneTags }
	]
};

export async function tagging(repository: MagitRepository) {

	const switches = [
		{ label: '-a', name: '--annotate', description: 'Annotate' },
		{ label: '-f', name: '--force', description: 'Force' },
		{ label: '-s', name: '--sign', description: 'Sign' },
		{ label: '-u', name: '--local-user=', description: 'Sign as', action: async (menuState: MenuState) => await CommandUtils.GetSwitchInput('-A', '--author=', menuState) },
	];

	return MenuUtil.showMenu(taggingMenu, { repository, switches });
}

async function createTag({ repository, switches }: MenuState) {

	const tagName = await window.showInputBox({ prompt: 'Tag name' });

	if (tagName) {

		const ref = await MagitUtils.chooseRef(repository, 'Place tag on', true, true);

		if (ref) {

			const args = ['tag', ...MenuUtil.switchesToArgs(switches), tagName, ref];

			if (
				switches?.find(({ label, activated }) => label === '-a' && activated)
			) {
				return Commit.runCommitLikeCommand(repository, args, {
					updatePostCommitTask: true,
				});
			}

			return await gitRun(repository.gitRepository, args);
		}
	}
}

async function deleteTag({ repository, switches }: MenuState) {

	const tagRef = await MagitUtils.chooseTag(repository, 'Delete tag');

	if (tagRef) {

		const args = ['tag', '-d', ...MenuUtil.switchesToArgs(switches), tagRef];

		return await gitRun(repository.gitRepository, args);
	}
}