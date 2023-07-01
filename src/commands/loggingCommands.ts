import { Uri, window } from 'vscode';
import { StatusMessageDisplayTimeout } from '../common/constants';
import { MenuState, MenuUtil, Option, Switch } from '../menu/menu';
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
	{ key: '=m', name: '--no-merges', description: 'Omit merges', activated: false },
	{ key: '=S', name: '--show-signature', description: 'Show signatures', activated: false },
	{ key: '=p', name: '--first-parent', description: 'First parent', activated: false },
	// { key: '-h', name: '++header', description: 'Show header', activated: false },
	{ key: '-p', name: '--patch', description: 'Show diffs', activated: false },
	{ key: '-s', name: '--stat', description: 'Show diffstats', activated: false },
	{ key: '-r', name: '--reverse', description: 'Reverse order', activated: false },
	{ key: '/m', name: '--simplify-merges', description: 'Prune some history', activated: false },
	{ key: '/f', name: '--full-history', description: 'Do not prune history', activated: false },
	{ key: '/s', name: '--sparse', description: 'Only commits changing given paths', activated: false },
	{ key: '/d', name: '--dense', description: 'Only selected commits plus meaningful history', activated: false },
	// { key: '/a', name: '--ancestry-path', description: 'Only commits existing directly on ancestry path', activated: false, value: '' },
	// { key: '-f', name: '--follow', description: 'Follow renames when showing single-file log', activated: false, value: '' },
	// { key: '--', name: '--', description: 'Limit to files', activated: false, value: '' },
	// { key: '-o', name: '--[topo|author-date|date]-order', description: 'Order commits by', activated: false, value: '' },
	// { key: '-A', name: '--author=', description: 'Limit to author', activated: false, value: '' },
	// { key: '=s', name: '--since=', description: 'Limit to commits since', activated: false, value: '' },
	// { key: '=u', name: '--until=', description: 'Limit to commits until', activated: false, value: '' },
	// { key: '-F', name: '--grep', description: 'Search messages', activated: false, value: '' },
	// { key: '-i', name: '--regexp-ignore-case', description: 'Search case-insensitive', activated: false, value: '' },
	// { key: '-I', name: '--invert-grep', description: 'Invert search pattern', activated: false, value: '' },
	// { key: '-G', name: '-G', description: 'Search changes', activated: false, value: '' },
	// { key: '-S', name: '-S', description: 'Search occurrences', activated: false, value: '' },
	// { key: '-L', name: '-L', description: 'Trace line evolution', activated: false, value: '' },

];

const options: Option[] = [
	{ key: '=n', name: '-n', description: 'Limit number of commits', value: '256', activated: true },
];

export async function logging(repository: MagitRepository) {
	return MenuUtil.showMenu(loggingMenu, { repository, switches, options });
}

// A function wrapper to avoid duplicate checking code
function wrap(action: (repository: MagitRepository, head: MagitBranch, switches: Switch[], options: Option[]) => Promise<any>) {
	return async ({ repository, switches, options }: MenuState) => {
		if (repository.HEAD && switches && options) {
			return action(repository, repository.HEAD, switches, options);
		}
	};
}

async function logCurrent(repository: MagitRepository, head: MagitBranch, switches: Switch[], options: Option[]) {
	const args = createLogArgs(switches, options);
	let revs = head.name ? [head.name] : await getRevs(repository);
	if (revs) {
		await log(repository, args, revs);
	}
}

async function logOther(repository: MagitRepository, head: MagitBranch, switches: Switch[], options: Option[]) {
	const args = createLogArgs(switches, options);
	const revs = await getRevs(repository);
	if (revs) {
		await log(repository, args, revs);
	}
}

async function logHead(repository: MagitRepository, head: MagitBranch, switches: Switch[], options: Option[]) {
	const args = createLogArgs(switches, options);
	await log(repository, args, ['HEAD']);
}

async function logLocalBranches(repository: MagitRepository, head: MagitBranch, switches: Switch[], options: Option[]) {
	const args = createLogArgs(switches, options);
	const revs = [head.name ?? 'HEAD', '--branches'];
	await log(repository, args, revs);
}

async function logBranches(repository: MagitRepository, head: MagitBranch, switches: Switch[], options: Option[]) {
	const args = createLogArgs(switches, options);
	const revs = [head.name ?? 'HEAD', '--branches', '--remotes'];
	await log(repository, args, revs);
}

async function logReferences(repository: MagitRepository, head: MagitBranch, switches: Switch[], options: Option[]) {
	const args = createLogArgs(switches, options);
	const revs = [head.name ?? 'HEAD', '--all'];
	await log(repository, args, revs);
}

export async function logFile(repository: MagitRepository, fileUri: Uri) {
	const incompatible_switch_keys = ['-g'];
	const compatible_switches = switches.map(x => (
		incompatible_switch_keys.includes(x.key) ? { ...x, activated: false } : { ...x }
	));
	let args = createLogArgs(compatible_switches, options);
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

function createLogArgs(switches: Switch[], options: Option[]) {
	const switchMap = switches.reduce((prev, current) => {
		prev[current.key] = current;
		return prev;
	}, {} as Record<string, Switch>);

	const decorateFormat = switchMap['-d'].activated ? '%d' : '';
	const formatArg = `--format=%H${decorateFormat} [%an] [%at]%s`;
	const args = ['log', formatArg, '--use-mailmap', ...MenuUtil.optionsToArgs(options)];

	if (switchMap['-r'].activated) {
		args.push(switchMap['-r'].name);

		// -g graph must be false
		switchMap['-g'].activated = false;
	}
	if (switchMap['-D'].activated) {
		args.push(switchMap['-D'].name);
	}
	if (switchMap['-g'].activated) {
		args.push(switchMap['-g'].name);
	}
	if (switchMap['-c'].activated) {
		args.push(switchMap['-c'].name);
	}
	// if (switchMap['-h'].activated) {
	// 	args.push(switchMap['-h'].name);
	// }
	if (switchMap['-s'].activated) {
		args.push(switchMap['-s'].name);
	}
	if (switchMap['-p'].activated) {
		args.push(switchMap['-p'].name);
	}
	if (switchMap['=m'].activated) {
		args.push(switchMap['=m'].name);
	}
	if (switchMap['=S'].activated) {
		args.push(switchMap['=S'].name);
	}
	if (switchMap['=p'].activated) {
		args.push(switchMap['=p'].name);
	}
	if (switchMap['/m'].activated) {
		args.push(switchMap['/m'].name);
	}
	if (switchMap['/f'].activated) {
		args.push(switchMap['/f'].name);
	}
	if (switchMap['/s'].activated) {
		args.push(switchMap['/s'].name);
	}
	if (switchMap['/d'].activated) {
		args.push(switchMap['/d'].name);
	}
	// if (switchMap['/a'].activated) {
	// 	args.push(switchMap['/a'].name);
	// }
	// if (switchMap['-f'].activated) {
	// 	args.push(switchMap['-f'].name);
	// }
	// if (switchMap['--'].activated) {
	// 	args.push(switchMap['--'].name);
	// }
	// if (switchMap['-o'].activated) {
	// 	args.push(switchMap['-o'].name);
	// }
	// if (switchMap['-A'].activated) {
	// 	args.push(switchMap['-A'].name);
	// }
	// if (switchMap['=s'].activated) {
	// 	args.push(switchMap['=s'].name);
	// }
	// if (switchMap['=u'].activated) {
	// 	args.push(switchMap['=u'].name);
	// }
	// if (switchMap['-F'].activated) {
	// 	args.push(switchMap['-F'].name);
	// }
	// if (switchMap['-i'].activated) {
	// 	args.push(switchMap['-i'].name);
	// }
	// if (switchMap['-I'].activated) {
	// 	args.push(switchMap['-I'].name);
	// }
	// if (switchMap['-G'].activated) {
	// 	args.push(switchMap['-G'].name);
	// }
	// if (switchMap['-S'].activated) {
	// 	args.push(switchMap['-S'].name);
	// }
	// if (switchMap['-L'].activated) {
	// 	args.push(`switchMap['-L'].name`);
	// }


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
