import * as JSONC from 'jsonc-parser';
import * as path from 'path';
import { workspace } from 'vscode';
import { logPath } from '../extension';
import { MagitRepository } from '../models/magitRepository';
import ViewUtils from '../utils/viewUtils';
import { HelpView } from '../views/helpView';

export async function magitHelp(repository: MagitRepository) {
	return openHelpView(repository);
}

export async function magitDispatch(repository: MagitRepository) {
	return openHelpView(repository);
}

async function openHelpView(repository: MagitRepository) {
	let keybindingsPath = path.join(logPath, '..', '..', '..', '..', 'User', 'keybindings.json');
	let userKeyBindings = [];

	try {
		const userKeyBindingsDoc = await workspace.openTextDocument(keybindingsPath);
		const userKeyBindingsText = userKeyBindingsDoc.getText().replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
		userKeyBindings = JSONC.parse(userKeyBindingsText);
	} catch (e) { console.error(e); }

	const uri = HelpView.encodeLocation(repository);
	return ViewUtils.showView(uri, new HelpView(uri, userKeyBindings));
}