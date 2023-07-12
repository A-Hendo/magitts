import { Uri, window } from 'vscode';
import * as Constants from '../common/constants';
import { MenuState, MenuUtil, Option, Switch } from '../menu/menu';
import { PickMenuItem, PickMenuUtil } from '../menu/pickMenu';
import { MagitChange } from '../models/magitChange';
import { MagitRepository } from '../models/magitRepository';
import { Stash } from '../models/stash';
import { Status } from '../typings/git';
import CommandUtils from '../utils/commandUtils';
import { gitRun } from '../utils/gitRawRunner';
import MagitUtils from '../utils/magitUtils';
import ViewUtils from '../utils/viewUtils';
import { DiffView } from '../views/diffView';
import { Section } from '../views/general/sectionHeader';
import SectionDiffView from '../views/sectionDiffView';
import { StashDetailView } from '../views/stashDetailView';
import * as VisitAtPoint from './visitAtPointCommands';

const diffingMenu = {
	title: 'Diffing',
	commands: [
		{ label: 'r', description: 'Diff range', action: diffRange },
		{ label: 'p', description: 'Diff paths', action: diffPaths },
		{ label: 'u', description: 'Diff unstaged', action: diffUnstaged },
		{ label: 's', description: 'Diff staged', action: diffStaged },
		{ label: 'w', description: 'Diff worktree', action: diffWorktree },
		{ label: 'c', description: 'Show commit', action: showCommit },
		{ label: 't', description: 'Show stash', action: showStash },
	]
};

export async function diffing(repository: MagitRepository) {

	const switches: Switch[] = [
		{ label: '--', name: '--', description: 'Limit to files' },
		{ label: '-f', name: '--ignore-submodules=', description: 'Ignore submodules', action: async (menuState: MenuState) => await CommandUtils.GetSwitchInput('-f', '--ignore-submodules=', menuState) },
		{ label: '-b', name: '--ignore-space-change', description: 'Ignore whitespace changes' },
		{ label: '-w', name: '--ignore-all-space', description: 'Ignore all whitespace' },
		{ label: '-d', name: '--irreversible-delete', description: 'Omit preimage for deletes' },
		{ label: '-U', name: '--U', description: 'Context lines' },
		{ label: '-W', name: '--function-context', description: 'Show surrounding functions' },

		// { label: '-A', name: '--diff-algorithm=', description: 'Diff algorithm' },
		{ label: '-M', name: '-M', description: 'Detect renames' },
		{ label: '-C', name: '-C', description: 'Detect copies' },
		{ label: '-x', name: '--no-ext-diff', description: 'Disallow external diff drivers', activated: true },
		{ label: '-s', name: '--stat', description: 'Show stats', activated: true },
		{ label: '-R', name: '-R', description: 'Reverse sides' },
		// { label: '-m', name: '--color-moved=', description: 'Color moved lines' },
	];

	const options: Switch[] = [
		{ label: '=g', name: '--show-signature', description: 'Show signature' },
		// { label: '=w', name: '--color-moved-ws=', description: 'Whitespace treatment for --color-moved' },
	];

	return MenuUtil.showMenu(diffingMenu, { repository, switches, options });
}

async function diffRange({ repository }: MenuState) {

	let range = await window.showInputBox({ prompt: `Diff for range (${repository.HEAD?.name})` });

	if (!range) {
		range = repository.HEAD?.name;
	}

	if (range) {
		const args = [range];
		return diff(repository, range, args);
	}
}

async function diffPaths({ repository }: MenuState) {
	const fileA = await window.showInputBox({ prompt: 'First file', value: repository.uri.fsPath });

	if (fileA) {

		const fileB = await window.showInputBox({ prompt: 'Second file', value: repository.uri.fsPath });

		if (fileB) {
			return diff(repository, 'files', ['--no-index', fileA, fileB]);
		}
	}
}

async function diffStaged({ repository }: MenuState) {
	return showDiffSection(repository, Section.Staged);
}

async function diffUnstaged({ repository }: MenuState) {
	return showDiffSection(repository, Section.Unstaged);
}
async function diffWorktree({ repository }: MenuState) {
	return diff(repository, 'worktree', ['HEAD']);
}

async function diff(repository: MagitRepository, id: string, args: string[] = []) {
	const diffResult = await gitRun(repository.gitRepository, ['diff', ...args]);

	const uri = DiffView.encodeLocation(repository, id);
	return ViewUtils.showView(uri, new DiffView(uri, diffResult.stdout));
}

export async function showDiffSection(repository: MagitRepository, section: Section, preserveFocus = false) {
	const uri = SectionDiffView.encodeLocation(repository);
	return ViewUtils.showView(uri, new SectionDiffView(uri, repository, section), { preserveFocus });
}

async function showStash({ repository }: MenuState) {

	const stashesPicker: PickMenuItem<Stash>[] = repository.stashes.map(stash => ({ label: `stash@{${stash.index}}`, meta: stash })) ?? [];

	const chosenStash = await PickMenuUtil.showMenu(stashesPicker);

	if (chosenStash) {
		return showStashDetail(repository, chosenStash);
	}
}

export async function showStashDetail(repository: MagitRepository, stash: Stash) {
	const uri = StashDetailView.encodeLocation(repository, stash);

	const stashShowTask = gitRun(repository.gitRepository, ['stash', 'show', '-p', `stash@{${stash.index}}`]);
	let stashUntrackedFiles: MagitChange[] = [];
	try {
		let untracked = await gitRun(repository.gitRepository, ['ls-tree', '-r', 'stash@{0}^3', '--name-only']);

		let untrackedList = untracked.stdout.split(Constants.LineSplitterRegex);
		untrackedList = untrackedList.slice(0, untrackedList.length - 1);

		stashUntrackedFiles = untrackedList.map(fileName => ({
			uri: Uri.parse(fileName),
			originalUri: Uri.parse(fileName),
			relativePath: fileName,
			renameUri: undefined,
			status: Status.UNTRACKED,
			section: Section.Untracked
		}));

	} catch { }

	const stashDiff = (await stashShowTask).stdout;

	return ViewUtils.showView(uri, new StashDetailView(uri, stash, stashDiff, stashUntrackedFiles));
}

async function showCommit({ repository }: MenuState) {

	const ref = await MagitUtils.chooseRef(repository, 'Show commit', true, true);

	if (ref) {
		return VisitAtPoint.visitCommit(repository, ref);
	}
}

export async function diffFile(repository: MagitRepository, fileUri: Uri, index = false) {

	const args = ['diff'];

	if (index) {
		args.push('--cached');
	}

	args.push(fileUri.fsPath);

	const diffResult = await gitRun(repository.gitRepository, args);

	const uri = DiffView.encodeLocation(repository, fileUri.path);
	return ViewUtils.showView(uri, new DiffView(uri, diffResult.stdout));
}
