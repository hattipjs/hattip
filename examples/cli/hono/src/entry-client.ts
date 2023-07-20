let count = 0;

const button = document.querySelector("button")!;
button.addEventListener("click", () => {
	button.textContent = `Clicked ${++count} time(s)`;
});
