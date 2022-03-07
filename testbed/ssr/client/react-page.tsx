import { useState } from "react";

export function ReactApp() {
  const [count, setCount] = useState(0);

  return (
    <>
      <h1>React SSR</h1>
      <button onClick={() => setCount((old) => old + 1)}>
        Clicked {count} time(s)
      </button>
    </>
  );
}
