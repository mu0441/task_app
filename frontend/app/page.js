"use client";

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

export default function Home() {
    const [columns, setColumns] = useState({
        todo: { name: "To Do", items: [] },
        inProgress: { name: "In Progress", items: [] },
        done: { name: "Done", items: [] }
    });

    const [newTask, setNewTask] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch("http://localhost:8080/api/v1/tasks");
                const result = await response.json();
                console.log("Fetched data:", result);
    
                // `status` に基づいてタスクを振り分ける
                const updatedColumns = {
                    todo: { name: "To Do", items: result.filter(task => task.Status === "todo") },
                    inProgress: { name: "In Progress", items: result.filter(task => task.Status === "inProgress") },
                    done: { name: "Done", items: result.filter(task => task.Status === "done") }
                };
    
                setColumns(updatedColumns);
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };
    
        fetchData();
    }, []);

    const addTask = () => {
        if (newTask.trim() === "") return;

        const newTaskItem = { title: newTask };
        console.log(newTaskItem);

        fetch('http://localhost:8080/api/v1/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTaskItem)
        })
        .then(response => response.json())
        .then(task => {
            setColumns(prevColumns => ({
                ...prevColumns,
                todo: {
                    ...prevColumns.todo,
                    items: [...prevColumns.todo.items, task]
                }
            }));
            setNewTask("");
        })
        .catch(err => console.error("Error adding task:", err));
    };

    const deleteTask = (columnId, taskId) => {
        console.log("Deleting task:", columnId, taskId); // ここで taskId を確認
        fetch(`http://localhost:8080/api/v1/tasks/${taskId}`, {
            method: 'DELETE',
        })
        .then(() => {
            setColumns(prevColumns => {
                const column = prevColumns[columnId];
                const newItems = column.items.filter(item => item.ID !== taskId);
                return {
                    ...prevColumns,
                    [columnId]: {
                        ...column,
                        items: newItems
                    }
                };
            });
        })
        .catch(err => console.error("Failed to delete task", err));
    };

    const onDragEnd = (result) => {
        if (!result.destination) return; // ドロップ先がない場合は処理しない
    
        const { source, destination } = result;
        const taskId = columns[source.droppableId].items[source.index].ID; // タスクの ID
        const newStatus = destination.droppableId; // 新しい状態（todo, inProgress, done）
    
        // フロントエンドの `columns` を更新
        setColumns(prevColumns => {
            const sourceColumn = prevColumns[source.droppableId];
            const destColumn = prevColumns[destination.droppableId];
            const sourceItems = [...sourceColumn.items];
            const destItems = [...destColumn.items];

            // 同じ場所にドロップされた場合、何もしない
        if (source.droppableId === destination.droppableId && source.index === destination.index) {
            console.log("Dropped in the same place, no change");
            return prevColumns;
        }
    
            const [movedTask] = sourceItems.splice(source.index, 1);
            movedTask.status = newStatus; // フロントエンドでも `status` を更新
            destItems.splice(destination.index, 0, movedTask);
    
            return {
                ...prevColumns,
                [source.droppableId]: { ...sourceColumn, items: sourceItems },
                [destination.droppableId]: { ...destColumn, items: destItems }
            };
        });
    
        // バックエンドに `status` を保存
        fetch(`http://localhost:8080/api/v1/tasks/${taskId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        })
        .then(response => response.json())
        .then(data => console.log("Updated task:", data))
        .catch(err => console.error("Error updating task:", err));
    };
    

    console.log("Columns:", columns); // columnsの状態を確認

    return (
        <div>
            <h1>Task App</h1>
            <input
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Add a new task"
            />
            <button onClick={addTask}>Add Task</button>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <DragDropContext onDragEnd={onDragEnd}>
                    {Object.entries(columns).map(([columnId, column], index) => {
                        console.log(`Column: ${columnId}, Items:`, column.items);
                        return (
                            <div style={{ margin: 8 }} key={columnId}>
                                <h2>{column.name}</h2>
                                <Droppable droppableId={columnId} key={columnId}>
                                    {(provided, snapshot) => (
                                        <div
                                            {...provided.droppableProps}
                                            ref={provided.innerRef}
                                            style={{
                                                background: snapshot.isDraggingOver ? "lightblue" : "lightgrey",
                                                padding: 4,
                                                width: 250,
                                                minHeight: 500
                                            }}
                                        >
                                            {(column.items || []).map((item, index) => {
                                                console.log("Rendering item:", item); // データが通過するか確認
                                                return (
                                                    <Draggable key={item?.ID || index} draggableId={item?.ID?.toString() || `item-${index}`} index={index}>
                                                        {(provided, snapshot) =>
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                style={{
                                                                    userSelect: "none",
                                                                    padding: 16,
                                                                    margin: "0 0 8px 0",
                                                                    minHeight: "50px",
                                                                    backgroundColor: snapshot.isDragging ? "#263B4A" : "#456C86",
                                                                    color: "white",
                                                                    ...provided.draggableProps.style
                                                                }}
                                                            >
                                                                {item ? item.Title : "No Title"}
                                                                <button onClick={() => deleteTask(columnId, item?.ID)}>Delete</button>
                                                            </div>
                                                        }
                                                    </Draggable>
                                                );
                                            })}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        );
                    })}
                </DragDropContext>
            </div>
        </div>
    );
}