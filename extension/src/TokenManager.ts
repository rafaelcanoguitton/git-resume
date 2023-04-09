import * as vscode from "vscode";

export class TokenManager {
  static globalState: vscode.Memento;

  static setToken(token: string) {
    return this.globalState.update("git-resume-token", token);
  }

  static getToken(): string | undefined {
    return this.globalState.get("git-resume-token");
  }
}
