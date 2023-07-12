import * as fs from 'fs';
import * as path from 'path';
import { Uri } from 'vscode';


const results: string[] = [];
let fileCount: number = 0;
let rootDir: string = '';
let ignore: string[] = ['.git', '.github'];


export default class FilePathUtils {

	private static isWindowsPath(path: string): boolean {
		return /^[a-zA-Z]:\\/.test(path);
	}

	public static isDescendant(parent: string, descendant: string): boolean {

		if (parent === descendant) {
			return true;
		}

		if (parent.charAt(parent.length - 1) !== path.sep) {
			parent += path.sep;
		}

		// Windows is case insensitive
		if (FilePathUtils.isWindowsPath(parent)) {
			parent = parent.toLowerCase();
			descendant = descendant.toLowerCase();
		}

		return descendant.startsWith(parent);
	}

	public static uriPathRelativeTo(uri: Uri, root: Uri) {
		return uri.path.slice(root.path.length + 1);
	}

	public static fileName(uri: Uri) {
		let pieces = uri.fsPath.split(/[/\\]/g);
		if (pieces[pieces.length - 1].length === 0) {
			pieces.pop();
		}
		if (pieces.length > 0) {
			return pieces[pieces.length - 1];
		}
		return '';
	}

	public static fileExtension(fileName: string) {
		const pieces = fileName.split('.');
		if (pieces.length > 0) {
			return pieces[pieces.length - 1];
		}
		return '';
	}

	private static readIgnoreFile(file: string): void {
		const lines = fs.readFileSync(file, 'utf8').split('\n');
		for (const line of lines) {
			if (line.trim() !== '') {
				ignore.push(line.trim());
			}
		}
	}

	public static traverseFiles(dir: string): string[] {
		const files = fs.readdirSync(dir);

		if (rootDir === '') {
			rootDir = dir;
			this.readIgnoreFile(dir + '/.gitignore');
		}

		for (const file of files) {
			const fileFullPath = path.join(dir, file);
			const stat = fs.statSync(fileFullPath);

			if (stat.isDirectory() && !ignore.includes(file)) {
				this.traverseFiles(fileFullPath);
			} else if (file && !ignore.includes(file) && !results.includes(fileFullPath)) {
				const path = fileFullPath.replace(rootDir, '').slice(1);
				results.push(path);
			}
		}
		return results;
	}
}