import { View } from '../general/view';
import { Section, SectionHeaderView } from '../general/sectionHeader';
import { LineBreakView } from '../general/lineBreakView';
import { Ref } from '../../typings/git';
import { BranchListingView } from './branchListingView';
import { MagitBranch } from '../../models/magitBranch';

export class BranchesSectionView extends View {
  isFoldable = true;

  get id() { return Section.Branches.toString(); }

  constructor(branches: Ref[], HEAD?: MagitBranch) {
    super();
    this.subViews = [
      new SectionHeaderView(Section.Branches, branches.length),
      ...branches.map(branch => new BranchListingView(branch, branch.name === HEAD?.name)),
      new LineBreakView()
    ];
  }
}