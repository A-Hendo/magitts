import { Uri, ViewColumn, workspace } from 'vscode';
import { MagitRepository } from '../models/magitRepository';
import { gitRun } from '../utils/gitRawRunner';
import ViewUtils from '../utils/viewUtils';
import { BlameView } from '../views/blameView';

export async function blameFile(repository: MagitRepository, fileUri: Uri) {

	const blameResult = await gitRun(repository.gitRepository, ['blame', fileUri.fsPath]);

	const uri = BlameView.encodeLocation(repository, fileUri);
	return ViewUtils.showView(uri, new BlameView(uri, blameResult.stdout), { viewColumn: ViewColumn.Active });
}