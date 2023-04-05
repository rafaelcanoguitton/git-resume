import * as cp from "child_process";
import * as vscode from "vscode";
const execShell = (cmd: string) =>
  new Promise<string>((resolve, reject) => {
    const workspaceDirectory = vscode.workspace.workspaceFolders;
    if (!workspaceDirectory) {
      vscode.window.showErrorMessage("You need to open a workspace first!");
      return;
    }
    cp.exec(cmd, { cwd: workspaceDirectory[0].uri.fsPath }, (err, out) => {
      if (err) {
        return reject(err);
      }
      return resolve(out);
    });
  });

const thereIsUntrackedFiles = async () => {
  const result = await execShell("git status --porcelain");
  const lines = result.split("\n");
  const untrackedFiles = lines.filter((line) => line.startsWith("??"));
  return untrackedFiles.length > 0;
};

async function getUserInput() {
  return new Promise((resolve) => {
    vscode.window
      .showInformationMessage(
        "There are untracked files, do you want to continue?",
        "Yes, stash work only on tracked files",
        "No, let me add them first"
      )
      .then((value) => {
        resolve(value);
      });
  });
}
export const gitStash = async () => {
  try {
    if (await thereIsUntrackedFiles()) {
      //let the user choose if he wants to continue with untacked files
      const userInput = await getUserInput();
      if (userInput === "No, let me add them first") {
        return;
      }
    }
    await execShell("git stash");
  } catch (error) {
    let message = "Something went wrong";
    if (error instanceof Error) {
      message = error.message;
    }
    if (message.includes("You do not have the initial commit yet")) {
      vscode.window.showInformationMessage(
        "You do not have the initial commit yet"
      );
    } else if (message.includes("No local changes to save")) {
      vscode.window.showInformationMessage("No local changes to save");
    } else if (message.includes("not a git repository")) {
      vscode.window.showInformationMessage("Not a git repository");
    } else {
      vscode.window.showErrorMessage(message);
    }
  }
};

export const gitSave = async () => {
  try {
    const patch = await execShell("git stash show -p");
    return patch;
  } catch (error) {
    vscode.window.showErrorMessage("Something went wrong");
    return "";
  }
};
