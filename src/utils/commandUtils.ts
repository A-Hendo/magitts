import { window } from "vscode";
import { MenuState } from "../menu/menu";



export default class CommandUtils {
    public static async GetSwitchInput(label: string, placeHolder: string, { switches }: MenuState) {
        const input = await window.showInputBox({ placeHolder: placeHolder });
        switches?.filter(s => s?.label === label).map(s => {
            s.value = input;
        });
    }
}