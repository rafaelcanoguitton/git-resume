<script lang="ts">
  import { onMount } from "svelte";

  let stashes = [];
  let loading = true;
  let loggedIn = undefined;
  onMount(() => {
    window.addEventListener("message", (event) => {
      const message = event.data; // The JSON data our extension sent
      switch (message.type) {
        case "new-stash":
          stashes = [...stashes, message.value];
          break;
        case "stashes":
          stashes = message.value;
          loading = false;
          break;
        case "logged-out":
          loggedIn = false;
          stashes = [];
          break;
        case "logged-in":
          loggedIn = message.value;
          if (loggedIn) {
            tsvscode.postMessage({
              type: "get-stashes",
              value: null,
            });
          }
          loading = true;
          break;
        case "stash":
          stashes = [...stashes, message.value];
          break;
        case "delete-stash":
          stashes = stashes.filter((s) => s.id !== message.value);
          break;
        default:
          break;
      }
    });
    tsvscode.postMessage({
      type: "is-logged-in",
      value: null,
    });
  });
</script>

<!-- svelte-ignore missing-declaration -->
{#if isAWorkspaceFolder && loading && loggedIn}
  <h2>Loading...</h2>
{:else if isAWorkspaceFolder && stashes.length === 0 && loggedIn}
  <h2>No stashes yet...</h2>
{:else if isAWorkspaceFolder}
  {#each stashes as stash, index}
    <div class="stash">
      <!-- svelte-ignore missing-declaration -->
      <button
        class="stash-apply"
        on:click={() => {
          tsvscode.postMessage({
            type: "stash-apply",
            value: { text: stash.text, id: stash.id },
          });
        }}
      >
        <!-- conver timestamp -->
        {index + 1}: on {new Date(stash.timestamp)
          .toLocaleString()
          .split(",")[0]} at {new Date(stash.timestamp)
          .toLocaleString()
          .split(",")[1]}
      </button>
      <button
        class="stash-delete-butt"
        on:click={() => {
          tsvscode.postMessage({
            type: "delete-stash",
            value: stash.id,
          });
        }}
        ><svg
          width="18"
          height="18"
          fill="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M20.25 4.5h-4.5V3.375A1.875 1.875 0 0 0 13.875 1.5h-3.75A1.875 1.875 0 0 0 8.25 3.375V4.5h-4.5a.75.75 0 0 0 0 1.5h.797l.89 14.293c.067 1.259 1.032 2.207 2.25 2.207h8.625c1.225 0 2.17-.927 2.25-2.203L19.453 6h.797a.75.75 0 1 0 0-1.5Zm-11.223 15H9a.75.75 0 0 1-.75-.723l-.375-10.5a.75.75 0 0 1 1.5-.054l.375 10.5a.75.75 0 0 1-.723.777Zm3.723-.75a.75.75 0 1 1-1.5 0V8.25a.75.75 0 1 1 1.5 0v10.5Zm1.5-14.25h-4.5V3.375A.37.37 0 0 1 10.125 3h3.75a.371.371 0 0 1 .375.375V4.5Zm1.5 14.277a.75.75 0 0 1-.75.723h-.027a.75.75 0 0 1-.723-.777l.375-10.5a.75.75 0 0 1 1.5.054l-.375 10.5Z"
          />
        </svg></button
      >
    </div>
  {/each}
{:else}
  <h2>Open a folder first</h2>
{/if}
<!-- svelte-ignore missing-declaration -->
{#if isAWorkspaceFolder && loggedIn}
  <button
    class="stash-button"
    on:click={() => {
      tsvscode.postMessage({
        type: "stash",
        value: null,
      });
    }}
  >
    Save Stash
  </button>
{/if}
<!-- svelte-ignore missing-declaration -->
<div class="login-container">
  {#if loggedIn}
    <button
      class="logout-button"
      on:click={() => {
        tsvscode.postMessage({
          type: "logout",
          value: null,
        });
      }}
    >
      Logout
    </button>
  {:else if loggedIn !== undefined && !loggedIn}
    <button
      class="login-button"
      on:click={() => {
        tsvscode.postMessage({
          type: "login",
          value: null,
        });
      }}
    >
      Login with <svg
        class="github-icon"
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="currentColor"
        ><path
          d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
        /></svg
      >
    </button>
  {/if}
</div>

<style>
  .login-container {
    display: flex;
    justify-content: end;
    align-items: end;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    background-color: #000000;
  }
  .logout-button {
    background-color: rgb(223, 61, 61);
    font-weight: bold;
  }
  .login-button {
    background-color: rgb(2, 56, 2);
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .stash {
    display: flex;
    justify-content: space-between;
  }
  .stash-butt {
    margin-right: 10px;
  }
  /* make the stash delete button as small as possible */
  .stash-delete-butt {
    border: none;
    align-self: flex-start;
    padding-top: 4px;
    color: rgb(223, 61, 61);
    width: auto;
  }
  .github-icon {
    margin-left: 5px;
    width: 20px;
    height: 20px;
    color: aliceblue;
  }
</style>
