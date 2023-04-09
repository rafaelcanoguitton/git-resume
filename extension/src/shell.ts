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
        err.message += out;
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

const thereAreUnsavedChanges = async () => {
  return vscode.workspace.textDocuments.filter((doc) => doc.isDirty).length > 0;
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
    if (await thereAreUnsavedChanges()) {
      throw new Error("Please save your changes first");
    }
    if (await thereIsUntrackedFiles()) {
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
      throw new Error("You do not have the initial commit yet");
    } else if (message.includes("No local changes to save")) {
      throw new Error("No local changes to save");
    } else if (message.includes("not a git repository")) {
      throw new Error("Not a git repository");
    } else {
      throw new Error(message);
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

export const gitApply = async (stash: string) => {
  try {
    await execShell(`echo "${stash}" > temp_patch.patch`);
    await execShell("git apply -3 temp_patch.patch");
  } catch (error) {
    if (
      error.message.includes("does not match index") ||
      error.message.includes("does not exist in index")
    ) {
      try {
        await execShell("git update-index --refresh");
        await execShell("git apply -3 temp_patch.patch");
      } catch (error) {
        if (error.message.includes("needs merge")) {
          throw new Error(
            "There's a merge in progress that prevents applying the changes, please resolve the merge first and try again."
          );
        }
        if (error.message.includes("with conflicts")) {
          throw new Error(
            "The changes were applied with conflicts, you'll need to resolve them manually."
          );
        }
        throw new Error(error.message);
      }
    }
    if (error.message.includes("with conflicts")) {
      throw new Error(
        "The changes were applied with conflicts, you'll need to resolve them manually."
      );
    }
    throw new Error(error.message);
  } finally {
    await execShell("rm temp_patch.patch");
  }
};

export const gitDeleteLastStash = async () => {
  try {
    await execShell("git stash drop");
  } catch (error) {
    vscode.window.showErrorMessage("Something went wrong");
  }
};
