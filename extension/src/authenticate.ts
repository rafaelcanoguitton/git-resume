import * as vscode from "vscode";
import { apiBaseUrl } from "./constants";
import polka from "polka";
import { TokenManager } from "./TokenManager";

export const authenticate = () => {
  return new Promise((resolve, reject) => {
    const app = polka();
    app.get("/auth/:token", async (req, res) => {
      const { token } = req.params;
      if (!token) {
        res.end(`<h1>Invalid token</h1>`);
        return;
      }

      TokenManager.setToken(token);

      res.end(`<h1>auth was successful, you may close this window</h1>`);

      app.server.close(() => {
        resolve(null);
      });
    });

    try {
      app.listen(54321, (err: Error) => {
        if (err) {
          if (err.message.includes("EADDRINUSE")) {
            vscode.commands.executeCommand(
              "vscode.open",
              vscode.Uri.parse(`${apiBaseUrl}/auth/github`)
            );
            reject(err);
            return;
          }
          vscode.window.showErrorMessage(err.message);
          reject(err);
        } else {
          vscode.commands.executeCommand(
            "vscode.open",
            vscode.Uri.parse(`${apiBaseUrl}/auth/github`)
          );
        }
      });
    } catch (err) {
      if (err.message.includes("EADDRINUSE")) {
        vscode.commands.executeCommand(
          "vscode.open",
          vscode.Uri.parse(`${apiBaseUrl}/auth/github`)
        );
        reject(err);
        return;
      }
      vscode.window.showErrorMessage(err.message);
      reject(err);
    }
  });
};
