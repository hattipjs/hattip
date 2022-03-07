let value = 0;

const button = document.querySelector("button")!;

button.addEventListener("click", () => {
  value++;
  button.textContent = `Clicked ${value} time(s)`;
});
