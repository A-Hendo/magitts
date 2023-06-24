import { Range } from 'vscode';
import { MagitRepository } from '../models/magitRepository';
import ViewUtils from '../utils/viewUtils';
import ProcessView from '../views/processView';

export async function processView(repository: MagitRepository) {

	const uri = ProcessView.encodeLocation(repository);
	let processView = ViewUtils.createOrUpdateView(repository, uri, () => new ProcessView(uri));

	return ViewUtils.showView(uri, processView, { selection: new Range(100000, 0, 100000, 0) });
}
