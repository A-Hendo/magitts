import * as fs from 'fs';
import * as path from 'path';
import { window } from 'vscode';
import { MenuState } from '../menu/menu';

export default class CommandUtils {
    public static async GetSwitchInput(label: string, placeHolder: string, { switches }: MenuState) {
        const input = await window.showInputBox({ placeHolder: placeHolder });
        switches?.filter(s => s?.label === label).map(s => {
            s.value = input;
        });
    }

    public static async GetInputOptions(label: string, placeHolder: string, items: string[], { switches }: MenuState) {
        const input = await window.showQuickPick(items, { canPickMany: false });
        switches?.filter(s => s?.label === label).map(s => {
            s.value = input;
        });
    }

    private readIgnoreFile(file: string): string[] {
        const lines = fs.readFileSync(file, 'utf8').split('\n');
        let ignoredFiles = [];
        for (const line of lines) {
            if (line.trim() !== '') {
                ignoredFiles.push(line.trim());
            }
        }
        return ignoredFiles;
    }

    private searchRecursive(dir: string): string[] {
        const results = [];
        const files = fs.readdirSync(dir);
        const ignoreFiles = this.readIgnoreFile('./gitignore');

        for (const file of files) {
            const fileFullPath = path.join(dir, file);
            const stat = fs.statSync(fileFullPath);

            if (stat.isDirectory()) {
                results.push(...this.searchRecursive(fileFullPath));
            } else if (file) {
                results.push(fileFullPath);
            }
        }

        return results;
    }
}