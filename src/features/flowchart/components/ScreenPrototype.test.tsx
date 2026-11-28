import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ScreenPrototype } from "./ScreenPrototype";
import type { FlowNode, FlowEdge } from "../types";
import type { ScreenControl } from "../lib/imagePrototype";

it("mengetik dan memilih file secara lokal lalu melaporkan transisi yang berbeda", () => {
  HTMLDialogElement.prototype.showModal = jest.fn();
  const report = jest.fn();
  const controls: ScreenControl[] = (["text", "file", "button"] as const).map((kind) => ({
    kind,
    id: kind,
    label: kind,
    width: 10,
    height: 10,
    x: 0,
    y: 0,
    target: "c",
  }));
  const nodes = [
    { id: "a", label: "Awal", prototypeImage: { src: "data:image/png;base64,AA==", controls } },
    { id: "b", label: "Verifikasi" },
    { id: "c", label: "Selesai" },
  ] as FlowNode[];
  render(
    <ScreenPrototype
      nodes={nodes}
      edges={[{ id: "ab", fromNodeId: "a", toNodeId: "b" } as FlowEdge]}
      start="a"
      edit={false}
      project="p"
      onSave={jest.fn()}
      onClose={jest.fn()}
      onReport={report}
    />
  );
  fireEvent.change(screen.getByLabelText("text"), { target: { value: "contoh" } });
  expect((screen.getByLabelText("text") as HTMLInputElement).value).toBe("contoh");
  fireEvent.change(screen.getByLabelText("file"), {
    target: { files: [new File(["contoh"], "contoh.txt")] },
  });
  expect(screen.getByText("contoh.txt")).toBeTruthy();
  fireEvent.click(screen.getByLabelText("button"));
  expect(report).toHaveBeenLastCalledWith([
    {
      status: "Berbeda",
      screen: "Awal",
      action: "button",
      expected: "Verifikasi",
      actual: "Selesai",
    },
  ]);
});
