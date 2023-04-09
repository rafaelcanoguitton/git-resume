import * as vscode from "vscode";
import getNonce from "./getNonce";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import { AppRouter } from "../../api/src";
import { TokenManager } from "./TokenManager";
import fetch from "node-fetch";
import AbortController from "abort-controller";
import { authenticate } from "./authenticate";
import { gitApply, gitDeleteLastStash, gitStash, gitSave } from "./shell";
import * as CryptoJS from "crypto-js";
import { TRPCError } from "@trpc/server";
import { apiBaseUrl } from "./constants";

export class SidebarProvider implements vscode.WebviewViewProvider {
  //trpc stuff
  // polyfill fetch & websocket

  _view?: vscode.WebviewView;
  _doc?: vscode.TextDocument;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,

      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (data) => {
      const globalAny = global as any;
      globalAny.AbortController = AbortController;
      globalAny.fetch = fetch;
      const url = `${apiBaseUrl}/trpc`;
      const trpc = createTRPCProxyClient<AppRouter>({
        links: [
          httpBatchLink({
            headers: () => {
              return {
                authorization: `Bearer ${TokenManager.getToken()}`,
              };
            },
            url,
          }),
        ],
        transformer: null,
      });
      switch (data.type) {
        case "onInfo": {
          if (!data.value) {
            return;
          }
          vscode.window.showInformationMessage(data.value);
          break;
        }
        case "onError": {
          if (!data.value) {
            return;
          }
          vscode.window.showErrorMessage(data.value);
          break;
        }
        case "get-stashes": {
          try {
            const stashes = await trpc.getStashes.query();
            webviewView.webview.postMessage({
              type: "stashes",
              value: stashes,
            });
          } catch (err) {
            vscode.window.showErrorMessage(err.message);
          }
          break;
        }
        case "login": {
          await authenticate();
          webviewView.webview.postMessage({
            type: "logged-in",
            value: TokenManager.getToken() ? true : false,
          });
          break;
        }
        case "logout": {
          TokenManager.setToken(null);
          break;
        }
        case "stash": {
          let stash;
          try {
            await gitStash();
            stash = await gitSave();
            await gitDeleteLastStash();
            const password = await vscode.window.showInputBox({
              prompt: "Enter a password to encrypt your stash",
              placeHolder: "Password",
              password: true,
            });
            if (password === undefined) {
              return;
            }
            const encryptedStash = CryptoJS.AES.encrypt(
              stash,
              password
            ).toString();
            const res = await trpc.postStash.mutate({
              text: encryptedStash,
              timestamp: new Date().toISOString(),
            });
            webviewView.webview.postMessage({
              type: "stash",
              value: res,
            });
          } catch (err) {
            if (err instanceof TRPCError) {
              vscode.window.showErrorMessage(err.message);
            } else {
              if (stash !== undefined) {
                await gitApply(stash);
              }
              vscode.window.showErrorMessage(err.message);
            }
          }
          break;
        }
        case "delete-stash": {
          try {
            const res = await trpc.deleteStash.mutate(data.value);
            webviewView.webview.postMessage({
              type: "delete-stash",
              value: res,
            });
          } catch (err) {
            vscode.window.showErrorMessage(err.message);
          }
          break;
        }
        case "stash-apply": {
          try {
            const password = await vscode.window.showInputBox({
              prompt: "Enter the password to decrypt your stash",
              placeHolder: "Password",
              password: true,
            });
            if (password === undefined) {
              return;
            }
            const bytes = CryptoJS.AES.decrypt(data.value.text, password);
            const decryptedStash = bytes.toString(CryptoJS.enc.Utf8);
            if (decryptedStash === "") {
              vscode.window.showErrorMessage("Incorrect password");
              return;
            }
            await gitApply(decryptedStash);
            //ask user if they want to delete stash
            const deleteStash = await vscode.window.showInformationMessage(
              "Stash applied. Would you like to delete it?",
              "Yes",
              "No"
            );
            if (deleteStash === "Yes") {
              const res = await trpc.deleteStash.mutate(data.value.id);
              webviewView.webview.postMessage({
                type: "delete-stash",
                value: res,
              });
            }
          } catch (err) {
            vscode.window.showErrorMessage(err.message);
          }
          break;
        }
        case "is-logged-in": {
          webviewView.webview.postMessage({
            type: "logged-in",
            value: TokenManager.getToken() ? true : false,
          });
        }
      }
    });
  }

  public revive(panel: vscode.WebviewView) {
    this._view = panel;
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "reset.css")
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "out", "compiled/sidebar.js")
    );
    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "out", "compiled/sidebar.css")
    );
    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css")
    );

    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();
    const isAWorkspaceFolder = vscode.workspace.workspaceFolders !== undefined;

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
        -->
        <meta http-equiv="Content-Security-Policy" content="default-src; img-src https: data:; style-src 'unsafe-inline' ${webview.cspSource}; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
        <link href="${styleMainUri}" rel="stylesheet">
        <script nonce="${nonce}">
          const tsvscode = acquireVsCodeApi();
          const isAWorkspaceFolder = ${isAWorkspaceFolder};
        </script>
			</head>
      <body>
        <script nonce="${nonce}" src="${scriptUri}">
			</body>
			</html>`;
  }
}
