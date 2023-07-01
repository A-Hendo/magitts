import { Uri, window } from 'vscode';
import { StatusMessageDisplayTimeout } from '../common/constants';
import { MenuState, MenuUtil, Option, Switch, Tag } from '../menu/menu';
import { MagitBranch } from '../models/magitBranch';
import { MagitLogEntry } from '../models/magitLogCommit';
import { MagitRepository } from '../models/magitRepository';
import { LogLevel, gitRun } from '../utils/gitRawRunner';
import MagitUtils from '../utils/magitUtils';
import ViewUtils from '../utils/viewUtils';
import LogView from '../views/logView';
const loggingMenu = {
	title: 'Logging',
	commands: [
		{ label: 'l', description: 'Log current', action: wrap(logCurrent) },
		{ label: 'o', description: 'Log other', action: wrap(logOther) },
		{ label: 'h', description: 'Log HEAD', action: wrap(logHead) },
		{ label: 'L', description: 'Log local branches', action: wrap(logLocalBranches) },
		{ label: 'b', description: 'Log branches', action: wrap(logBranches) },
		{ label: 'a', description: 'Log references', action: wrap(logReferences) },
	]
};

const switches: Switch[] = [
	{ key: '-D', name: '--simplify-by-decoration', description: 'Simplify by decoration', activated: false },
	{ key: '-g', name: '--graph', description: 'Show graph', activated: true },
	{ key: '-c', name: '--color', description: 'Show graph in color', activated: false },
	{ key: '-d', name: '--decorate', description: 'Show refnames', activated: true },
	// { key: '-h', name: '++header', description: 'Show header', activated: false },
	{ key: '-p', name: '--patch', description: 'Show diffs', activated: false },
	{ key: '-s', name: '--stat', description: 'Show diffstats', activated: false },
	{ key: '-r', name: '--reverse', description: 'Reverse order', activated: false },
	// { key: '-f', name: '--follow', description: 'Follow renames when showing single-file log', activated: false},
	// { key: '--', name: '--', description: 'Limit to files', activated: false},
	// { key: '-o', name: '--[topo|author-date|date]-order', description: 'Order commits by', activated: false },
	// { key: '-A', name: '--author=', description: 'Limit to author', activated: false },
	// { key: '-F', name: '--grep', description: 'Search messages', activated: false },
	// { key: '-i', name: '--regexp-ignore-case', description: 'Search case-insensitive', activated: false },
	// { key: '-I', name: '--invert-grep', description: 'Invert search pattern', activated: false },
	// { key: '-G', name: '-G', description: 'Search changes', activated: false },
	// { key: '-S', name: '-S', description: 'Search occurrences', activated: false },
	// { key: '-L', name: '-L', description: 'Trace line evolution', activated: false },

];

const options: Option[] = [
	{ key: '=n', name: '-n', description: 'Limit number of commits', value: '256', activated: true },
	{ key: '=m', name: '--no-merges', description: 'Omit merges', activated: false },
	{ key: '=S', name: '--show-signature', description: 'Show signatures', activated: false },
	{ key: '=p', name: '--first-parent', description: 'First parent', activated: false },
	// { key: '=s', name: '--since=', description: 'Limit to commits since', activated: false},
	// { key: '=u', name: '--until=', description: 'Limit to commits until', activated: false },
];

const tags: Tag[] = [
	{ key: '/m', name: '--simplify-merges', description: 'Prune some history', activated: false },
	{ key: '/f', name: '--full-history', description: 'Do not prune history', activated: false },
	{ key: '/s', name: '--sparse', description: 'Only commits changing given paths', activated: false },
	{ key: '/d', name: '--dense', description: 'Only selected commits plus meaningful history', activated: false },
	// { key: '/a', name: '--ancestry-path', description: 'Only commits existing directly on ancestry path', activated: false },
];

export async function logging(repository: MagitRepository) {
	return MenuUtil.showMenu(loggingMenu, { repository, switches, options, tags });
}

// A function wrapper to avoid duplicate checking code
function wrap(action: (repository: MagitRepository, head: MagitBranch, switches: Switch[], options: Option[], tags: Tag[]) => Promise<any>) {
	return async ({ repository, switches, options, tags }: MenuState) => {
		if (repository.HEAD && switches && options && tags) {
			return action(repository, repository.HEAD, switches, options, tags);
		}
	};
}

async function logCurrent(repository: MagitRepository, head: MagitBranch, switches: Switch[], options: Option[], tags: Tag[]) {
	const args = createLogArgs(switches, options, tags);
	let revs = head.name ? [head.name] : await getRevs(repository);
	if (revs) {
		await log(repository, args, revs);
	}
}

async function logOther(repository: MagitRepository, head: MagitBranch, switches: Switch[], options: Option[], tags: Tag[]) {
	const args = createLogArgs(switches, options, tags);
	const revs = await getRevs(repository);
	if (revs) {
		await log(repository, args, revs);
	}
}

async function logHead(repository: MagitRepository, head: MagitBranch, switches: Switch[], options: Option[], tags: Tag[]) {
	const args = createLogArgs(switches, options, tags);
	await log(repository, args, ['HEAD']);
}

async function logLocalBranches(repository: MagitRepository, head: MagitBranch, switches: Switch[], options: Option[], tags: Tag[]) {
	const args = createLogArgs(switches, options, tags);
	const revs = [head.name ?? 'HEAD', '--branches'];
	await log(repository, args, revs);
}

async function logBranches(repository: MagitRepository, head: MagitBranch, switches: Switch[], options: Option[], tags: Tag[]) {
	const args = createLogArgs(switches, options, tags);
	const revs = [head.name ?? 'HEAD', '--branches', '--remotes'];
	await log(repository, args, revs);
}

async function logReferences(repository: MagitRepository, head: MagitBranch, switches: Switch[], options: Option[], tags: Tag[]) {
	const args = createLogArgs(switches, options, tags);
	const revs = [head.name ?? 'HEAD', '--all'];
	await log(repository, args, revs);
}

export async function logFile(repository: MagitRepository, fileUri: Uri) {
	const incompatible_switch_keys = ['-g'];
	const compatible_switches = switches.map(x => (
		incompatible_switch_keys.includes(x.key) ? { ...x, activated: false } : { ...x }
	));
	let args = createLogArgs(compatible_switches, options, tags);
	args.push('--follow');
	await log(repository, args, ['HEAD'], [fileUri.fsPath]);
}

async function log(repository: MagitRepository, args: string[], revs: string[], paths: string[] = []) {
	const output = await gitRun(repository.gitRepository, args.concat(revs, ['--'], paths), {}, LogLevel.Error);
	const logEntries = parseLog(output.stdout);
	const revName = revs.join(' ');
	const uri = LogView.encodeLocation(repository);
	return ViewUtils.showView(uri, new LogView(uri, { entries: logEntries, revName }));
}

async function getRevs(repository: MagitRepository) {
	const input = await MagitUtils.chooseRef(repository, 'Log rev,s:', false, false, true);
	if (input && input.length > 0) {
		// split space or commas
		return input.split(/[, ]/g).filter(r => r.length > 0);
	}

	window.setStatusBarMessage('Nothing selected', StatusMessageDisplayTimeout);
}

function createLogArgs(switches: Switch[], options: Option[], tags: Tag[]) {
	const switchMap = switches.reduce((prev, current) => {
		prev[current.key] = current;
		return prev;
	}, {} as Record<string, Switch>);

	const tagMap = tags.reduce((prev, current) => {
		prev[current.key] = current;
		return prev;
	}, {} as Record<string, Switch>);

	const decorateFormat = switchMap['-d'].activated ? '%d' : '';
	const formatArg = `--format=%H${decorateFormat} [%an] [%at]%s`;
	const args = ['log', formatArg, '--use-mailmap', ...MenuUtil.optionsToArgs(options), ...MenuUtil.tagsToArgs(tags)];

	if (switchMap['-r'].activated) {
		switches?.filter(s => s.key === '-g' ? s.activated = false : undefined);
	}
	switches?.filter(s => s.activated && s.key !== '-d').map(s => args.push(s.name))

	return args;
}

function parseLog(stdout: string): MagitLogEntry[] {
	const commits: MagitLogEntry[] = [];
	// Split stdout lines
	const lines = stdout.match(/[^\r\n]+/g);
	// regex to parse line
	const lineRe = new RegExp(
		'^([/|\\-_* .o]+)?' + // Graph
		'([a-f0-9]{40})' + // Sha
		'( \\(([^()]+)\\))?' + // Refs
		'( \\[([^\\[\\]]+)\\])' + // Author
		'( \\[([^\\[\\]]+)\\])' + // Time
		'(.*)$', // Message
		'g');
	// regex to match graph only line
	const graphRe = /^[/|\\-_* .o]+$/g;
	const shaRe = new RegExp('([a-f0-9]{40})');

	lines?.forEach(l => {
		if (l.match(graphRe) || !l.match(shaRe)) {
			// Add to previous commits
			commits[commits.length - 1]?.graph?.push(l);
		} else {
			const matches = l.matchAll(lineRe).next().value;
			if (matches && matches.length > 0) {
				const graph = matches[1]; // undefined if graph doesn't exist
				const log = {
					graph: graph ? [graph] : undefined,
					refs: (matches[4] ?? '').split(', ').filter((m: string) => m),
					author: matches[6],
					time: new Date(Number(matches[8]) * 1000), // convert seconds to milliseconds
					commit: {
						hash: matches[2],
						message: matches[9],
						parents: [],
						authorEmail: undefined
					}
				};
				commits.push(log);
			}
		}
	});
	return commits;
}
