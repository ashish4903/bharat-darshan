import { render, screen } from "@testing-library/react";
import App from "./App.jsx";

it("renders the site title", () => {
  render(<App />);
  expect(screen.getByRole("heading", { name: "Bharat Darshan" })).toBeInTheDocument();
});
