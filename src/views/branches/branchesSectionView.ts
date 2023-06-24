import { MagitBranch } from '../../models/magitBranch';
import { Ref } from '../../typings/git';
import { LineBreakView } from '../general/lineBreakView';
import { Section, SectionHeaderView } from '../general/sectionHeader';
import { View } from '../general/view';
import { BranchListingView } from './branchListingView';

export class BranchesSectionView extends View {
	isFoldable = true;

	get id() { return Section.Branches.toString(); }

	constructor (branches: Ref[], HEAD?: MagitBranch) {
		super();
		this.subViews = [
			new SectionHeaderView(Section.Branches, branches.length),
			...branches.map(branch => new BranchListingView(branch, branch.name === HEAD?.name)),
			new LineBreakView()
		];
	}
}