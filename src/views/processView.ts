import { Uri } from 'vscode';
import * as Constants from '../common/constants';
import { processLog } from '../extension';
import { MagitProcessLogEntry } from '../models/magitProcessLogEntry';
import { MagitRepository } from '../models/magitRepository';
import { DocumentView } from './general/documentView';
import { TextView } from './general/textView';
import { View } from './general/view';

class ProcessLogEntryView extends View {
	isFoldable = true;

	get id() { return '' + this.entry.index; }

	constructor (private entry: MagitProcessLogEntry) {
		super();
		this.addSubview(
			new TextView(this.renderCommandStatus(entry) + entry.command.join(' '))
		);
		if (entry.stdout) {
			this.addSubview(new TextView(entry.stdout));
		}
		if (entry.stderr) {
			this.addSubview(new TextView(entry.stderr));
		}
	}

	private renderCommandStatus(entry: MagitProcessLogEntry) {
		let statusChar = 'run';

		if (entry.exitCode !== undefined) {
			statusChar = entry.exitCode.toString();
		}
		return `[${statusChar}] `;
	}
}

export default class ProcessView extends DocumentView {

	static UriPath: string = 'process.magit';

	constructor (uri: Uri) {
		super(uri);
		this.provideContent();
	}

	provideContent() {

		if (processLog.length > 0) {
			this.subViews = processLog.map(entry => new ProcessLogEntryView(entry));
		} else {
			this.subViews = [new TextView('(No entries yet)')];
		}
	}

	public update(state: MagitRepository): void {
		this.provideContent();
		this.triggerUpdate();
	}

	static encodeLocation(repository: MagitRepository): Uri {
		return Uri.parse(`${Constants.MagitUriScheme}:${ProcessView.UriPath}?${repository.uri.path}#process`);
	}
}