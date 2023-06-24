import { MagitChange } from '../../models/magitChange';
import { LineBreakView } from '../general/lineBreakView';
import { Section, SectionHeaderView } from '../general/sectionHeader';
import { View } from '../general/view';
import { ChangeView } from './changeView';

export class ChangeSectionView extends View {
	isFoldable = true;

	get id() { return this.section.toString() + this.context; }

	constructor (public section: Section, public changes: MagitChange[], private context = '') {
		super();
		this.subViews = [
			new SectionHeaderView(section, changes.length),
			...changes.map(change => new ChangeView(section, change, context)),
			new LineBreakView()
		];
	}
}