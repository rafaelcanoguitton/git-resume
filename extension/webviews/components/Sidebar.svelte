<script lang="ts">
  let todos = [];
  let count = 0;
</script>

<div>{count}</div>
<button
  on:click={() => {
    count++;
  }}>Increment</button
>

<button on:click={()=>{
  tsvscode.postMessage({
    type: 'onInfo',
    value: 'Hello from the webview'
  })
}}>click me</button>

<style>
  div {
    color: pink;
  }
</style>
