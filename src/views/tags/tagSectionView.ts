import { Ref } from '../../typings/git';
import { LineBreakView } from '../general/lineBreakView';
import { Section, SectionHeaderView } from '../general/sectionHeader';
import { View } from '../general/view';
import { TagListingView } from './tagListingView';

export class TagSectionView extends View {
	isFoldable = true;

	get id() { return Section.Tags.toString(); }

	constructor (tags: Ref[]) {
		super();
		this.subViews = [
			new SectionHeaderView(Section.Tags, tags.length),
			...tags.map(tag => new TagListingView(tag)),
			new LineBreakView()
		];
	}
}