"use client";

import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

function EditRow({ initialTitle, onSave, onCancel }) {
  const [val, setVal] = useState(initialTitle ?? "");
  return (
    <div className="space-y-2">
      <input
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave(val);
          if (e.key === "Escape") onCancel();
        }}
        placeholder="タイトルを入力"
      />
      <div className="flex gap-2">
        <button
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          onClick={() => onSave(val)}
        >
          保存
        </button>
        <button
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          onClick={onCancel}
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const [columns, setColumns] = useState({
    todo: { name: "To Do", items: [] },
    inProgress: { name: "In Progress", items: [] },
    done: { name: "Done", items: [] },
  });
  const [newTask, setNewTask] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        if (!token) {
          window.location.href = "/login";
          return;
        }
        const res = await fetch("http://localhost:8080/api/v1/tasks", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();

        const updated = {
          todo: { name: "To Do", items: result.filter((t) => t.Status === "todo") },
          inProgress: { name: "In Progress", items: result.filter((t) => t.Status === "inProgress") },
          done: { name: "Done", items: result.filter((t) => t.Status === "done") },
        };
        setColumns(updated);
      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
  }, []);

  const addTask = async () => {
    const title = newTask.trim();
    if (!title) return;
    const token = localStorage.getItem("token");
    const res = await fetch("http://localhost:8080/api/v1/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title }),
    });
    const task = await res.json();
    setColumns((prev) => ({
      ...prev,
      todo: { ...prev.todo, items: [...prev.todo.items, task] },
    }));
    setNewTask("");
  };

  const deleteTask = async (columnId, taskId) => {
    const token = localStorage.getItem("token");
    await fetch(`http://localhost:8080/api/v1/tasks/${taskId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setColumns((prev) => {
      const col = prev[columnId];
      const items = col.items.filter((i) => i.ID !== taskId);
      return { ...prev, [columnId]: { ...col, items } };
    });
  };

  const updateTaskTitle = async (taskId, newTitle) => {
    const token = localStorage.getItem("token");
    const res = await fetch(`http://localhost:8080/api/v1/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: newTitle }),
    });
    if (!res.ok) throw new Error("update failed");
    return res.json();
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const { source, destination } = result;
    // 同じ位置なら何もしない
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const task = columns[source.droppableId].items[source.index];
    const taskId = task.ID;
    const newStatus = destination.droppableId;

    // 先にUI更新
    setColumns((prev) => {
      const srcCol = prev[source.droppableId];
      const dstCol = prev[destination.droppableId];
      const srcItems = [...srcCol.items];
      const [moved] = srcItems.splice(source.index, 1);
      const dstItems = [...dstCol.items];
      dstItems.splice(destination.index, 0, { ...moved, Status: newStatus });
      return {
        ...prev,
        [source.droppableId]: { ...srcCol, items: srcItems },
        [destination.droppableId]: { ...dstCol, items: dstItems },
      };
    });

    // バックエンドにPATCH
    const token = localStorage.getItem("token");
    fetch(`http://localhost:8080/api/v1/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus }),
    }).catch((err) => console.error(err));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Task Board</h1>
          <div className="flex gap-2">
            <input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              placeholder="新しいタスク"
              className="w-64 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={addTask}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 active:scale-[.99]"
            >
              追加
            </button>
          </div>
        </div>
      </header>

      {/* Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {Object.entries(columns).map(([columnId, column]) => (
            <section key={columnId} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
              <h2 className="mb-2 px-1 text-sm font-medium uppercase tracking-wide text-slate-500">
                {column.name}
              </h2>
              <Droppable droppableId={columnId}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[480px] rounded-xl p-2 transition ${
                      snapshot.isDraggingOver ? "bg-indigo-50 ring-2 ring-indigo-200" : "bg-white"
                    }`}
                  >
                    {(column.items || []).map((item, index) => (
                      <Draggable
                        key={item?.ID ?? `item-${index}`}
                        draggableId={(item?.ID ?? `item-${index}`).toString()}
                        index={index}
                      >
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            className={`mb-2 rounded-xl border p-3 text-sm shadow-sm transition ${
                              dragSnapshot.isDragging
                                ? "border-indigo-300 bg-indigo-600 text-white shadow-md"
                                : "border-slate-200 bg-white hover:shadow"
                            }`}
                          >
                            {item?.isEditing ? (
                              <EditRow
                                initialTitle={item.Title}
                                onSave={async (newTitle) => {
                                  const updated = await updateTaskTitle(item.ID, newTitle);
                                  setColumns((prev) => {
                                    const col = prev[columnId];
                                    const items = col.items.map((it) =>
                                      it.ID === item.ID ? { ...updated, isEditing: false } : it
                                    );
                                    return { ...prev, [columnId]: { ...col, items } };
                                  });
                                }}
                                onCancel={() =>
                                  setColumns((prev) => {
                                    const col = prev[columnId];
                                    const items = col.items.map((it) =>
                                      it.ID === item.ID ? { ...it, isEditing: false } : it
                                    );
                                    return { ...prev, [columnId]: { ...col, items } };
                                  })
                                }
                              />
                            ) : (
                              <div className="flex items-start justify-between gap-3">
                                <p className="leading-6">{item?.Title ?? "No Title"}</p>
                                <div className="shrink-0 space-x-2">
                                  <button
                                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                                    onClick={() =>
                                      setColumns((prev) => {
                                        const col = prev[columnId];
                                        const items = col.items.map((it) =>
                                          it.ID === item.ID ? { ...it, isEditing: true } : it
                                        );
                                        return { ...prev, [columnId]: { ...col, items } };
                                      })
                                    }
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className="rounded-md bg-rose-600 px-2 py-1 text-xs font-medium text-white hover:bg-rose-700"
                                    onClick={() => deleteTask(columnId, item?.ID)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </section>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
