import { hydrate } from "react-dom";
import { ReactApp } from "./react-page";

const container = document.getElementById("root");
hydrate(<ReactApp />, container);
