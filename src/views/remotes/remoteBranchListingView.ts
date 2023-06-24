import { Ref } from '../../typings/git';
import GitTextUtils from '../../utils/gitTextUtils';
import { TextView } from '../general/textView';

export class RemoteBranchListingView extends TextView {

	get id() { return this.ref.name?.toString() + this.ref.type.toString(); }

	constructor (public ref: Ref) {
		super();

		let [remotePart, namePart] = GitTextUtils.remoteBranchFullNameToSegments(ref.name);

		this.textContent = `  ${namePart}`;
	}
}