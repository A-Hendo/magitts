import * as fs from 'fs';
import { EOL } from 'os';
import { window } from 'vscode';
import * as Constants from '../common/constants';
import { MenuState, MenuUtil } from '../menu/menu';
import { PickMenuItem, PickMenuUtil } from '../menu/pickMenu';
import { MagitRepository } from '../models/magitRepository';
import FilePathUtils from '../utils/filePathUtils';

const ignoringMenu = {
	title: 'Ignoring',
	commands: [
		{ label: 'l', description: 'Ignore locally', action: ({ repository }: MenuState) => ignore(repository) },
		{ label: 'g', description: 'Ignore globally (add to .gitignore)', action: ({ repository }: MenuState) => ignore(repository, true) }
	]
};

export async function ignoring(repository: MagitRepository) {
	return MenuUtil.showMenu(ignoringMenu, { repository });
}

async function ignore(repository: MagitRepository, globally = false) {

	const ignoreSuggestions: PickMenuItem<string>[] = [];

	repository.untrackedFiles.forEach(change => {
		const fileName = FilePathUtils.fileName(change.originalUri);
		const fileExtension = FilePathUtils.fileExtension(fileName);

		const globPattern1 = `/*.${fileExtension}`;
		const globPattern2 = `*.${fileExtension}`;

		ignoreSuggestions.push({ label: fileName, meta: fileName });
		ignoreSuggestions.push({ label: globPattern1, meta: globPattern1 });
		ignoreSuggestions.push({ label: globPattern2, meta: globPattern2 });
	});

	const ignorePattern = await PickMenuUtil.showMenuWithFreeform(ignoreSuggestions, `File or pattern to ignore ${globally ? 'globally' : 'locally'}`);

	if (ignorePattern) {

		let gitIgnoreFilePath: string;

		if (globally) {
			gitIgnoreFilePath = repository.uri.fsPath + '/.gitignore';
		} else {
			gitIgnoreFilePath = repository.uri.fsPath + '/.git/info/exclude';
		}

		return new Promise<void>((resolve, reject) => {
			fs.appendFile(gitIgnoreFilePath, EOL + ignorePattern, (err) => {
				if (err) {
					reject(err);
					return;
				}
				window.setStatusBarMessage(`Wrote file ${gitIgnoreFilePath}`, Constants.StatusMessageDisplayTimeout);
				resolve();
			});
		});
	}
}