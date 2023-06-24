import * as vscode from 'vscode';
import { SemanticTokenTypes } from '../common/constants';
import { views } from '../extension';
import { SemanticTextView } from '../views/general/semanticTextView';
import { View } from '../views/general/view';

export default class SemanticTokensProvider implements vscode.DocumentSemanticTokensProvider {

	readonly legend = new vscode.SemanticTokensLegend(Object.values(SemanticTokenTypes), []);

	dispose() { }

	provideDocumentSemanticTokens(document: vscode.TextDocument): vscode.ProviderResult<vscode.SemanticTokens> {
		const currentView = views.get(document.uri.toString());
		const builder = new vscode.SemanticTokensBuilder(this.legend);
		if (currentView) {
			this.visitNode(currentView, builder);
		}
		return builder.build();
	}

	visitNode(view: View, builder: vscode.SemanticTokensBuilder) {
		if (view instanceof SemanticTextView) {
			view.tokens.forEach(token => {
				builder.push(token.range, token.tokenType);
			});
		}

		if (!view.folded) {
			view.subViews.forEach(v => this.visitNode(v, builder));

			// Include first 'line' of folded view, but only if it's a SemanticTextView
		} else if (view.subViews.length) {

			let firstSubView = view.subViews[0];
			if (firstSubView instanceof SemanticTextView) {
				firstSubView.tokens.forEach(token => {
					builder.push(token.range, token.tokenType);
				});
			}
		}
	}
}
