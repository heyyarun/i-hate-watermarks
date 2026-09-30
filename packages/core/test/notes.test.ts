import { expect, it } from "vitest";
import { inspectText } from "../src";

it("adds the no-hits note only when nothing is found", () => {
  expect(inspectText("clean").notes).toHaveLength(5);
  expect(inspectText("x​y").notes).toHaveLength(4);
});
