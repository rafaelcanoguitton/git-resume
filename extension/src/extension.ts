// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { HelloWorldPanel } from "./HelloWorldPanel";
import { gitStash, gitSave } from "./shell";
import { SidebarProvider } from "./SidebarProvider";
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const sidebarProvider = new SidebarProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "git-resume-sidebar",
      sidebarProvider
    )
  );
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "git-resume" is now active!');

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json

  context.subscriptions.push(
    vscode.commands.registerCommand("git-resume.resume", async () => {
      await gitStash();
      await gitSave();
      const patch = await gitSave();
      //TODO
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("git-resume.hello", () => {
      console.log("hello world");
      HelloWorldPanel.createOrShow(context.extensionUri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("git-resume.refresh", () => {
      console.log("hello world");
      HelloWorldPanel.kill();
      HelloWorldPanel.createOrShow(context.extensionUri);
    })
  );
}

// This method is called when your extension is deactivated
// export function deactivate() {}
