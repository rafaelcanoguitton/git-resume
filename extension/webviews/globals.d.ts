import * as _vscode from "vscode";
import type { AppRouter } from "../../api/src/index";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
declare global {
  const tsvscode: {
    postMessage: ({ type: string, value: any }) => void;
  };

  let loggedIn: boolean;
  const isAWorkspaceFolder: boolean;
}
