import { Disposable, ExtensionContext, commands, extensions, languages, window, workspace } from 'vscode';
import { magitApplyEntityAtPoint } from './commands/applyAtPointCommands';
import { blameFile } from './commands/blamingCommands';
import { branching, showRefs } from './commands/branchingCommands';
import { cherryPicking } from './commands/cherryPickingCommands';
import { CommandPrimer } from './commands/commandPrimer';
import { magitCommit, setCodePath } from './commands/commitCommands';
import { copyBufferRevisionCommands } from './commands/copyBufferRevisionCommands';
import { copySectionValueCommand } from './commands/copySectionValueCommands';
import { diffFile, diffing } from './commands/diffingCommands';
import { magitDiscardAtPoint } from './commands/discardAtPointCommands';
import { fetching } from './commands/fetchingCommands';
import { filePopup } from './commands/filePopupCommands';
import { magitDispatch, magitHelp } from './commands/helpCommands';
import { ignoring } from './commands/ignoringCommands';
import { logFile, logging } from './commands/loggingCommands';
import { clearSaveClose, moveToNextEntity, moveToPreviousEntity, quitMagitView, saveClose, toggleAllFoldsInChangeSection } from './commands/macros';
import { merging } from './commands/mergingCommands';
import { processView } from './commands/processCommands';
import { pulling } from './commands/pullingCommands';
import { pushing } from './commands/pushingCommands';
import { rebasing } from './commands/rebasingCommands';
import { remoting } from './commands/remotingCommands';
import { resetHard, resetMixed, resetting } from './commands/resettingCommands';
import { reverseAtPoint } from './commands/reverseAtPointCommands';
import { reverting } from './commands/revertingCommands';
import { running } from './commands/runningCommands';
import { magitStage, magitStageAll, magitUnstage, magitUnstageAll, stageFile, unstageFile } from './commands/stagingCommands';
import { stashing } from './commands/stashingCommands';
import { magitRefresh, magitStatus } from './commands/statusCommands';
import { submodules } from './commands/submodulesCommands';
import { tagging } from './commands/taggingCommands';
import { magitVisitAtPoint } from './commands/visitAtPointCommands';
import { worktree } from './commands/worktreeCommands';
import * as Constants from './common/constants';
import { forgeRefreshInterval } from './forge';
import { MagitProcessLogEntry } from './models/magitProcessLogEntry';
import { MagitRepository } from './models/magitRepository';
import ContentProvider from './providers/contentProvider';
import HighlightProvider from './providers/highlightProvider';
import SemanticTokensProvider from './providers/semanticTokensProvider';
import { API, GitExtension } from './typings/git';
import { DocumentView } from './views/general/documentView';

export const magitRepositories: Map<string, MagitRepository> = new Map<string, MagitRepository>();
export const views: Map<string, DocumentView> = new Map<string, DocumentView>();
export const processLog: MagitProcessLogEntry[] = [];

export let gitApi: API;
export let logPath: string;
export let magitConfig: { displayBufferSameColumn?: boolean, forgeEnabled?: boolean, hiddenStatusSections: Set<string>, quickSwitchEnabled?: boolean, gitPath?: string, gitRebaseAutostash?: boolean, gitReplaceView?: boolean };

function loadConfig() {
	let workspaceConfig = workspace.getConfiguration('magit');

	magitConfig = {
		displayBufferSameColumn: workspaceConfig.get('display-buffer-function') === 'same-column',
		forgeEnabled: workspaceConfig.get('forge-enabled'),
		hiddenStatusSections: readHiddenStatusSections(workspaceConfig.get('hide-status-sections')),
		quickSwitchEnabled: workspaceConfig.get('quick-switch-enabled'),
		gitPath: workspaceConfig.get('git-path'),
		gitRebaseAutostash: workspaceConfig.get('git-rebase-autostash') ?? true,
		gitReplaceView: workspaceConfig.get('git-replace-view') ?? true,
	};

	let configCodePath: string | undefined = workspaceConfig.get('code-path');
	setCodePath(configCodePath);
}

function readHiddenStatusSections(configEntry: any): Set<string> {
	if (Array.isArray(configEntry)) {
		return new Set(configEntry);
	} else {
		return new Set();
	}
}

export function activate(context: ExtensionContext) {

	const gitExtension = extensions.getExtension<GitExtension>('vscode.git')!;
	const gitExtensionExports = gitExtension.exports;
	if (!gitExtensionExports.enabled) {
		throw new Error('vscode.git Git extension not enabled');
	}

	loadConfig();
	workspace.onDidChangeConfiguration(configChangedEvent => {
		if (configChangedEvent.affectsConfiguration('magit')) {
			loadConfig();
		}
	});

	context.subscriptions.push(gitExtensionExports.onDidChangeEnablement(enabled => {
		if (!enabled) {
			throw new Error('vscode.git Git extension was disabled');
		}
	}));

	gitApi = gitExtensionExports.getAPI(1);
	logPath = context.logUri.fsPath;

	context.subscriptions.push(gitApi.onDidCloseRepository(repository => {
		magitRepositories.delete(repository.rootUri.fsPath);
	}));

	const contentProvider = new ContentProvider();
	const highlightProvider = new HighlightProvider();
	const semanticTokensProvider = new SemanticTokensProvider();

	const providerRegistrations = Disposable.from(
		workspace.registerTextDocumentContentProvider(Constants.MagitUriScheme, contentProvider),
		languages.registerDocumentHighlightProvider(Constants.MagitDocumentSelector, highlightProvider),
		languages.registerDocumentSemanticTokensProvider(Constants.MagitDocumentSelector, semanticTokensProvider, semanticTokensProvider.legend),
	);
	context.subscriptions.push(
		contentProvider,
		providerRegistrations,
	);

	context.subscriptions.push(
		commands.registerCommand('magit.status', magitStatus),
		commands.registerTextEditorCommand('magit.help', CommandPrimer.primeRepo(magitHelp, false)),
		commands.registerTextEditorCommand('magit.dispatch', CommandPrimer.primeRepo(magitDispatch, false)),

		commands.registerTextEditorCommand('magit.commit', CommandPrimer.primeRepo(magitCommit)),
		commands.registerTextEditorCommand('magit.refresh', CommandPrimer.primeRepo(magitRefresh)),
		commands.registerTextEditorCommand('magit.pulling', CommandPrimer.primeRepo(pulling)),
		commands.registerTextEditorCommand('magit.pushing', CommandPrimer.primeRepo(pushing)),
		commands.registerTextEditorCommand('magit.stashing', CommandPrimer.primeRepo(stashing)),
		commands.registerTextEditorCommand('magit.fetching', CommandPrimer.primeRepo(fetching)),
		commands.registerTextEditorCommand('magit.branching', CommandPrimer.primeRepo(branching)),
		commands.registerTextEditorCommand('magit.merging', CommandPrimer.primeRepo(merging)),
		commands.registerTextEditorCommand('magit.rebasing', CommandPrimer.primeRepo(rebasing)),
		commands.registerTextEditorCommand('magit.resetting', CommandPrimer.primeRepo(resetting)),
		commands.registerTextEditorCommand('magit.reset-mixed', CommandPrimer.primeRepo(resetMixed)),
		commands.registerTextEditorCommand('magit.reset-hard', CommandPrimer.primeRepo(resetHard)),
		commands.registerTextEditorCommand('magit.remoting', CommandPrimer.primeRepo(remoting)),
		commands.registerTextEditorCommand('magit.logging', CommandPrimer.primeRepo(logging, false)),
		commands.registerTextEditorCommand('magit.show-refs', CommandPrimer.primeRepo(showRefs, false)),
		commands.registerTextEditorCommand('magit.diffing', CommandPrimer.primeRepo(diffing, false)),
		commands.registerTextEditorCommand('magit.tagging', CommandPrimer.primeRepo(tagging)),
		commands.registerTextEditorCommand('magit.cherry-picking', CommandPrimer.primeRepo(cherryPicking)),
		commands.registerTextEditorCommand('magit.reverting', CommandPrimer.primeRepo(reverting)),
		commands.registerTextEditorCommand('magit.ignoring', CommandPrimer.primeRepo(ignoring)),
		commands.registerTextEditorCommand('magit.running', CommandPrimer.primeRepo(running)),
		commands.registerTextEditorCommand('magit.worktree', CommandPrimer.primeRepo(worktree)),
		commands.registerTextEditorCommand('magit.submodules', CommandPrimer.primeRepo(submodules)),
		commands.registerTextEditorCommand('magit.process-log', CommandPrimer.primeRepo(processView, false)),
		commands.registerTextEditorCommand('magit.stage-all', CommandPrimer.primeRepo(magitStageAll)),
		commands.registerTextEditorCommand('magit.unstage-all', CommandPrimer.primeRepo(magitUnstageAll)),

		commands.registerTextEditorCommand('magit.visit-at-point', CommandPrimer.primeRepoAndView(magitVisitAtPoint, false)),
		commands.registerTextEditorCommand('magit.apply-at-point', CommandPrimer.primeRepoAndView(magitApplyEntityAtPoint)),
		commands.registerTextEditorCommand('magit.discard-at-point', CommandPrimer.primeRepoAndView(magitDiscardAtPoint)),
		commands.registerTextEditorCommand('magit.reverse-at-point', CommandPrimer.primeRepoAndView(reverseAtPoint)),
		commands.registerTextEditorCommand('magit.stage', CommandPrimer.primeRepoAndView(magitStage)),
		commands.registerTextEditorCommand('magit.unstage', CommandPrimer.primeRepoAndView(magitUnstage)),

		commands.registerTextEditorCommand('magit.file-popup', CommandPrimer.primeFileCommand(filePopup, false)),
		commands.registerTextEditorCommand('magit.blame-file', CommandPrimer.primeFileCommand(blameFile, false)),
		commands.registerTextEditorCommand('magit.diff-file', CommandPrimer.primeFileCommand(diffFile, false)),
		commands.registerTextEditorCommand('magit.log-file', CommandPrimer.primeFileCommand(logFile, false)),
		commands.registerTextEditorCommand('magit.stage-file', CommandPrimer.primeFileCommand(stageFile)),
		commands.registerTextEditorCommand('magit.unstage-file', CommandPrimer.primeFileCommand(unstageFile)),

		commands.registerTextEditorCommand('magit.copy-section-value', CommandPrimer.primeRepoAndView(copySectionValueCommand)),
		commands.registerTextEditorCommand('magit.copy-buffer-revision', CommandPrimer.primeRepoAndView(copyBufferRevisionCommands))
	);

	context.subscriptions.push(commands.registerTextEditorCommand('magit.toggle-fold', CommandPrimer.primeRepoAndView(async (repo: MagitRepository, view: DocumentView) => {
		const selectedView = view.click(window.activeTextEditor!.selection.active);

		if (selectedView?.isFoldable) {
			selectedView.folded = !selectedView.folded;
			view.triggerUpdate();
		}
	}, false)));

	context.subscriptions.push(commands.registerTextEditorCommand('magit.quit', quitMagitView));

	context.subscriptions.push(commands.registerTextEditorCommand('magit.move-next-entity', CommandPrimer.primeRepoAndView(moveToNextEntity, false)));
	context.subscriptions.push(commands.registerTextEditorCommand('magit.move-previous-entity', CommandPrimer.primeRepoAndView(moveToPreviousEntity, false)));
	context.subscriptions.push(commands.registerTextEditorCommand('magit.toggle-all-folds-in-change-section-at-point', CommandPrimer.primeRepoAndView(toggleAllFoldsInChangeSection, true)));

	context.subscriptions.push(commands.registerTextEditorCommand('magit.save-and-close-editor', saveClose));
	context.subscriptions.push(commands.registerTextEditorCommand('magit.clear-and-abort-editor', clearSaveClose));
}

export function deactivate() {

	if (forgeRefreshInterval) {
		clearInterval(forgeRefreshInterval);
	}
}
