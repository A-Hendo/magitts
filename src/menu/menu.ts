import { QuickPick, QuickPickItem, window } from 'vscode';
import { magitConfig } from '../extension';
import { MagitRepository } from '../models/magitRepository';

export interface Menu {
  title: string;
  commands: MenuItem[];
}

export interface MenuItem extends QuickPickItem {
  action: (menuState: MenuState) => Promise<any>;
}

export interface MenuState {
  repository: MagitRepository;
  switches?: Switch[];
  options?: Option[];
  tags?: Tag[];
  data?: any;
}

export interface Switch {
  key: string;
  name: string;
  description: string;
  activated?: boolean;
  value?: string | undefined;
}

export interface Option extends Switch { }

export interface Tag extends Switch { }

export class MenuUtil {

  static showMenu(menu: Menu, menuState: MenuState): Promise<void> {

    let menuItems: MenuItem[] = menu.commands.map(item => ({ ...item, description: `\t${item.description}` }));

    if (menuState.switches) {

      let activeSwitches: string = '';

      menuState.switches.filter(t => t.activated).map(t => {
        if (t.value !== undefined) {
          activeSwitches += `${t.name}"${t.value}" `;
        } else {
          activeSwitches += `${t.name} `;
        }
      })
      const activeSwitchesPresentation = `[ ${activeSwitches} ]`;

      menuItems.push({
        label: '-',
        description: `\tSwitches ${activeSwitches.length > 0 ? activeSwitchesPresentation : ''}`,
        action: async (menuState: MenuState) => {
          const updatedSwitches = await MenuUtil.showSwitchesMenu(menuState);
          return MenuUtil.showMenu(menu, { ...menuState, switches: updatedSwitches });
        }
      });
    }

    if (menuState.options) {

      let activeOptions: string = '';

      menuState.options.filter(t => t.activated).map(t => {
        if (t.value !== undefined) {
          activeOptions += `${t.name}"${t.value}" `;
        } else {
          activeOptions += `${t.name} `;
        }
      })
      const activeOptionsPresentation = `[ ${activeOptions} ]`;

      menuItems.push({
        label: '=',
        description: `\tOptions ${activeOptions.length > 0 ? activeOptionsPresentation : ''}`,
        action: async (menuState: MenuState) => {
          const updatedOptions = await MenuUtil.showOptionsMenu(menuState);
          return MenuUtil.showMenu(menu, { ...menuState, options: updatedOptions });
        }
      });
    }

    if (menuState.tags) {
      let activeTags: string = '';

      menuState.tags.filter(t => t.activated).map(t => {
        if (t.value !== undefined) {
          activeTags += `${t.name}"${t.value}" `;
        } else {
          activeTags += `${t.name} `;
        }
      })

      const activeTagsPresentation = `[ ${activeTags} ]`;

      menuItems.push({
        label: '/',
        description: `\tTags ${activeTags.length > 0 ? activeTagsPresentation : ''}`,
        action: async (menuState: MenuState) => {
          const updatedTags = await MenuUtil.showTagsMenu(menuState);
          return MenuUtil.showMenu(menu, { ...menuState, tags: updatedTags });
        }
      });
    }

    return MenuUtil.runMenu({ ...menu, commands: menuItems }, menuState);
  }

  static switchesToArgs(switches?: Switch[]): string[] {
    return switches?.filter(s => s.activated).map(s => s.name) ?? [];
  }

  static optionsToArgs(options?: Option[]): string[] {
    return options?.filter(s => s.activated).map(s => s.value !== undefined ? `${s.name}${s?.value}` : s.name) ?? [];
  }

  static tagsToArgs(tags?: Tag[]): string[] {
    return tags?.filter(s => s.activated).map(s => s.value !== undefined ? `${s.name}${s?.value}` : s.name) ?? [];
  }

  private static runMenu(menu: Menu, menuState: MenuState): Promise<void> {

    return new Promise((resolve, reject) => {

      let resolveOnHide = true;
      const _quickPick = window.createQuickPick<MenuItem>();

      _quickPick.title = menu.title;
      _quickPick.items = menu.commands;

      // Select with single key stroke

      const eventListenerDisposable = _quickPick.onDidChangeValue(async (e) => {
        if (_quickPick.value === 'q') {
          return _quickPick.hide();
        }
        const chosenItems = _quickPick.items.filter(i => i.label === _quickPick.value);
        if (chosenItems.length > 0) {
          _quickPick.value = '';
          resolveOnHide = false;
          _quickPick.hide();
          try {
            await chosenItems[0].action(menuState);
            resolve();
          } catch (error) {
            reject(error);
          }
        }
      });

      // Select with arrows + enter

      const acceptListenerDisposable = _quickPick.onDidAccept(async () => {

        if (_quickPick.activeItems.length > 0) {
          const chosenItems = _quickPick.activeItems[0] as MenuItem;
          resolveOnHide = false;
          _quickPick.hide();
          try {
            await chosenItems.action(menuState);
            resolve();
          } catch (error) {
            reject(error);
          }
        }
      });

      const didHideDisposable = _quickPick.onDidHide(() => {
        _quickPick.dispose();
        eventListenerDisposable.dispose();
        acceptListenerDisposable.dispose();
        didHideDisposable.dispose();
        if (resolveOnHide) {
          resolve();
        }
      });

      _quickPick.show();
    });
  }

  private static showSwitchesMenu(menuState: MenuState): Promise<Switch[]> {

    let getUpdatedSwitches = (quickPick: QuickPick<QuickPickItem>, { switches }: MenuState) => switches!.map(s =>
    ({
      ...s,
      activated: quickPick.selectedItems.find(item => item.label === s.key) !== undefined
    })
    );

    let items = menuState.switches!.map(s => ({ label: s.key, description: `\t${s.description}\t${s.name}`, picked: s.activated }));

    return MenuUtil.showSwitchLikeMenu<Switch[]>(items, menuState,
      async (item) => {
        return { ...item, picked: !item.picked };
      },
      getUpdatedSwitches,
      'Switches (press letter for switches you want to enable)',
      true,
      '-'
    );
  }

  private static showOptionsMenu(menuState: MenuState): Promise<Option[]> {

    let items = menuState.options!.map(s => ({ label: s.key, description: `\t${s.description}\t${s.activated && s.value !== undefined ? `${s.name}"${s?.value}"` : s.name}`, picked: s.activated }));

    let getUpdatedOptions = (quickPick: QuickPick<QuickPickItem>, { options }: MenuState) => options!.map(s => {
      let selectedItem = quickPick.selectedItems.find(item => item.label === s.key);
      return {
        ...s,
        activated: selectedItem !== undefined,
        value: selectedItem?.detail?.split('"')[1]
      };
    });

    return MenuUtil.showSwitchLikeMenu<Option[]>(items, menuState,
      async (item) => {
        return { ...item, picked: !item.picked };
      },
      getUpdatedOptions,
      'Options (press the letter of the option you want to set)',
      true,
      '='
    );
  }

  private static showTagsMenu(menuState: MenuState): Promise<Tag[]> {

    let items = menuState.tags!.map(s => ({ label: s.key, description: `\t${s.description}\t${s.activated ? `${s.name}"${s?.value}"` : s.name}`, picked: s.activated }));

    let getUpdatedTags = (quickPick: QuickPick<QuickPickItem>, { tags }: MenuState) => tags!.map(s => {
      let selectedItem = quickPick.selectedItems.find(item => item.label === s.key);
      return {
        ...s,
        activated: selectedItem !== undefined,
        value: selectedItem?.detail?.split('"')[1]
      };
    });

    return MenuUtil.showSwitchLikeMenu<Tag[]>(items, menuState,
      async (item) => {
        return { ...item, picked: !item.picked };
      },
      getUpdatedTags,
      'Tags (press letter for tags you want to enable)',
      true,
      '/'
    );
  }

  private static matchesSwitchOrOption(input: string, switchkey: string): boolean {
    return input === switchkey ||
      input === switchkey.replace('-', '') ||
      input === switchkey.replace('=', '') ||
      input === switchkey.replace('/', '');
  }

  private static showSwitchLikeMenu<T>(
    items: QuickPickItem[],
    menuState: MenuState,
    processItemSelection: (q: QuickPickItem) => Promise<QuickPickItem>,
    getUpdatedState: (q: QuickPick<QuickPickItem>, m: MenuState) => T,
    title = '',
    canSelectMany = false,
    ignoreKey?: string): Promise<T> {

    return new Promise((resolve, reject) => {

      let resolveOnHide = true;
      let shouldDispose = false;
      const _quickPick = window.createQuickPick<QuickPickItem>();

      _quickPick.canSelectMany = canSelectMany;
      _quickPick.title = title;
      _quickPick.items = items;
      if (canSelectMany) {
        _quickPick.selectedItems = _quickPick.items.filter(s => s.picked);
      }

      const eventListenerDisposable = _quickPick.onDidChangeValue(async (e) => {

        if (_quickPick.value === 'q') {
          return _quickPick.hide();
        }
        if (ignoreKey && _quickPick.value === ignoreKey) {
          return;
        }
        let quickPickValue = _quickPick.value;
        _quickPick.value = '';

        shouldDispose = false;

        let updated: QuickPickItem[] = [];

        for (let item of _quickPick.items) {
          if (MenuUtil.matchesSwitchOrOption(quickPickValue, item.label)) {
            updated.push(await processItemSelection(item));
            if (magitConfig.quickSwitchEnabled) {
              _quickPick.hide();
            }
          } else {
            updated.push({ ...item });
          }
        }

        _quickPick.items = updated;
        if (canSelectMany) {
          _quickPick.selectedItems = _quickPick.items.filter(s => s.picked);
        }

        shouldDispose = true;
        _quickPick.show();
      });

      const acceptListenerDisposable = _quickPick.onDidAccept(() => {
        resolveOnHide = false;
        _quickPick.hide();
        resolve(getUpdatedState(_quickPick, menuState));
      });

      const didHideDisposable = _quickPick.onDidHide(() => {
        if (!shouldDispose) {
          return;
        }
        _quickPick.dispose();
        eventListenerDisposable.dispose();
        acceptListenerDisposable.dispose();
        didHideDisposable.dispose();
        if (resolveOnHide) {
          resolve(getUpdatedState(_quickPick, menuState));
        }
      });

      _quickPick.show();
    });
  }
}