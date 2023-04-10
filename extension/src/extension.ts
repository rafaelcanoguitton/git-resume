// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { gitSave, gitStash } from "./shell";
import { SidebarProvider } from "./SidebarProvider";
import type { AppRouter } from "../../api/src/index"; //i can't get this to work :(
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import fetch from "node-fetch";
import AbortController from "abort-controller";
import { authenticate } from "./authenticate";
import { TokenManager } from "./TokenManager";
import { apiBaseUrl } from "./constants";
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

export function activate(context: vscode.ExtensionContext) {
  TokenManager.globalState = context.globalState;
  //trpc stuff
  // polyfill fetch & websocket
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
  const sidebarProvider = new SidebarProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "git-resume-sidebar",
      sidebarProvider
    )
  );
}

// This method is called when your extension is deactivated
// export function deactivate() {}
