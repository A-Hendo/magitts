import { MagitChange } from '../../models/magitChange';
import { Section } from '../general/sectionHeader';
import { View } from '../general/view';
import { ChangeHeaderView } from './changeHeaderView';
import { HunkView } from './hunkView';

export class ChangeView extends View {
	isFoldable = true;
	foldedByDefault = true;

	get id() { return this.change.uri.toString() + this.section.toString() + this.context; }

	constructor (public section: Section, public change: MagitChange, private context = '') {
		super();
		this.addSubview(new ChangeHeaderView(change));
		if (this.change.hunks) {
			this.addSubview(...this.change.hunks.map(hunk => new HunkView(section, hunk)));
		}
	}
}